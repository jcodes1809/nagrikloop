import { cfg } from "./config";

export type ImageIn = { mime: string; b64: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(url: string, init: RequestInit, timeoutMs: number) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------------- Gemini (main) ----------------
// Google sometimes answers 503 "high demand". That is temporary, so we retry 3 times with a pause,
// then (optionally) try GEMINI_FALLBACK_MODEL before giving up.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

async function geminiCall(model: string, prompt: string, images: ImageIn[]): Promise<string> {
  const c = cfg();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          ...images.map((i) => ({ inline_data: { mime_type: i.mime, data: i.b64 } })),
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  };
  const ATTEMPTS = 3;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const res = await post(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": c.geminiKey },
        body: JSON.stringify(body),
      },
      c.timeoutMs
    );
    if (res.ok) {
      const j: any = await res.json();
      const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
      if (!text) throw new Error(`${model}: Gemini returned no text (maybe blocked)`);
      return text;
    }
    if (RETRYABLE.has(res.status) && attempt < ATTEMPTS) {
      await sleep(c.retryMs * attempt);
      continue;
    }
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
    throw new Error(`${model}: HTTP ${res.status} ${detail}`);
  }
  throw new Error(`${model}: failed`);
}

export async function geminiGenerate(prompt: string, images: ImageIn[]): Promise<string> {
  const c = cfg();
  if (!c.geminiKey) throw new Error("GEMINI_API_KEY not set");
  if (!c.geminiModel) throw new Error("GEMINI_MODEL not set");
  try {
    return await geminiCall(c.geminiModel, prompt, images);
  } catch (e: any) {
    if (c.geminiFallbackModel && c.geminiFallbackModel !== c.geminiModel) {
      try {
        return await geminiCall(c.geminiFallbackModel, prompt, images);
      } catch (e2: any) {
        throw new Error(`${e.message} | fallback ${e2.message}`);
      }
    }
    throw e;
  }
}

// ---------------- Groq (backup) ----------------
export async function groqGenerate(prompt: string, images: ImageIn[]): Promise<string> {
  const c = cfg();
  if (!c.groqKey) throw new Error("GROQ_API_KEY not set");
  const model = images.length ? c.groqVisionModel : c.groqTextModel;
  if (!model) throw new Error(images.length ? "no GROQ_VISION_MODEL set (Groq skipped for photos)" : "GROQ_TEXT_MODEL not set");
  const content: any = images.length
    ? [
        { type: "text", text: prompt },
        ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.b64}` } })),
      ]
    : prompt;
  const callGroq = (useJsonMode: boolean) =>
    post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.groqKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          temperature: 0.2,
          ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      },
      c.timeoutMs
    );
  let res = await callGroq(true);
  // Some Groq models do not support JSON mode (HTTP 400). Retry once without it; our parser handles plain text.
  if (res.status === 400) res = await callGroq(false);
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    throw new Error(`Groq ${model}: HTTP ${res.status} ${detail}`);
  }
  const j: any = await res.json();
  const text = j?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");
  return text;
}

// ---------------- Groq Whisper (voice -> text) ----------------
export async function groqTranscribe(bytes: Uint8Array, filename: string, mime: string): Promise<string> {
  const c = cfg();
  if (!c.groqKey) throw new Error("GROQ_API_KEY not set");
  if (!c.groqWhisperModel) throw new Error("GROQ_WHISPER_MODEL not set");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
  form.append("model", c.groqWhisperModel);
  form.append("response_format", "json");
  const res = await post(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    { method: "POST", headers: { Authorization: `Bearer ${c.groqKey}` }, body: form },
    c.timeoutMs
  );
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Groq Whisper HTTP ${res.status} ${detail}`);
  }
  const j: any = await res.json();
  return String(j?.text ?? "").trim();
}