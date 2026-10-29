// The brain of Member 1's side.  Golden rule: AI reads and writes, plain code decides.
import { cfg } from "./config";
import { HttpError } from "./errors";
import { extractJson } from "./json";
import { geminiGenerate, groqGenerate, type ImageIn } from "./providers";
import { loadImage, sha256 } from "./image";
import { lookupAnalyze, lookupVerify } from "./cache";
import { renderTemplate } from "./templates";
import {
  validateAnalyze, validateVerify, validateLetterOut, validateLetterInput,
  type Analyze, type Verify, type Tone,
} from "./validate";
import { intakePrompt, INTAKE_PROMPT_VERSION } from "../../prompts/intake_v1";
import { VERIFY_PROMPT, VERIFY_PROMPT_VERSION } from "../../prompts/verify_v1";
import { letterPrompt, LETTER_PROMPT_VERSION } from "../../prompts/letter_v1";

export type Source = "gemini" | "groq" | "cache" | "template" | "none";

// Chain: Gemini -> Groq. (Cache / template fallbacks are handled by the callers below.)
export async function runJson<T>(
  prompt: string,
  images: ImageIn[],
  validate: (x: any) => T
): Promise<{ data: T | null; source: Source; errors: string[] }> {
  const errors: string[] = [];
  const chain: [Source, (p: string, i: ImageIn[]) => Promise<string>][] = [
    ["gemini", geminiGenerate],
    ["groq", groqGenerate],
  ];
  for (const [name, fn] of chain) {
    try {
      const text = await fn(prompt, images);
      return { data: validate(extractJson(text)), source: name, errors };
    } catch (e: any) {
      errors.push(`${name}: ${e?.message ?? e}`);
      console.error(`[ai] ${name} failed:`, e?.message ?? e);
    }
  }
  return { data: null, source: "none", errors };
}

// ------------------------------------------------------------------ 1. ANALYZE
export async function analyzePhoto(input: {
  image_base64?: string; image_url?: string; lat?: number | null; lng?: number | null;
  note?: string; demo_key?: string; skip_cache?: boolean;
}) {
  const img = await loadImage(input);
  const hash = sha256(img.bytes);
  const cached = () => (input.skip_cache ? null : lookupAnalyze(input.demo_key, hash));

  let result: Analyze | null = null;
  let source: Source = "none";
  let errors: string[] = [];

  if (cfg().forceCache) {
    const hit = cached();
    if (hit) { result = hit; source = "cache"; }
  }
  if (!result) {
    const r = await runJson(intakePrompt(input.note ?? ""), [{ mime: img.mime, b64: img.b64 }], validateAnalyze);
    errors = r.errors;
    if (r.data) { result = r.data; source = r.source; }
  }
  if (!result) {
    const hit = cached();
    if (hit) { result = hit; source = "cache"; }
  }
  if (!result) {
    throw new HttpError(503, "AI unavailable and no cached answer. Ask the citizen to fill the form manually.", {
      manual_entry_required: true, source: "none", errors,
    });
  }

  // Plain-code decision (not AI): is this complaint acceptable?
  const accept = result.is_garbage && result.confidence >= 50;
  return {
    ...result,
    ward: null as string | null, // Ward comes from lat/lng + ward lookup in backend, NOT from the AI
    accept,
    reject_reason: accept ? null : result.is_garbage ? "low_confidence" : "not_garbage",
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    source,
    prompt_version: INTAKE_PROMPT_VERSION,
  };
}

// ------------------------------------------------------------------ 2. VERIFY
export function applyVerifyRules(v: Verify, minConfidence: number) {
  if (v.same_location === "no")
    return {
      ...v, verdict: "unclear" as const, location_mismatch: true, rule_applied: "location_mismatch",
      reason: `${v.reason} (The after photo seems to be from a different place, so it cannot confirm the fix.)`,
    };
  if (v.verdict === "fixed" && v.confidence < minConfidence)
    return { ...v, verdict: "unclear" as const, location_mismatch: false, rule_applied: "low_confidence_fixed" };
  return { ...v, location_mismatch: false, rule_applied: null as string | null };
}

const ACTION = { fixed: "citizen_confirm_close", not_fixed: "reopen_and_escalate", unclear: "ask_citizen" } as const;

export async function verifyFix(input: {
  before_image_base64?: string; before_image_url?: string;
  after_image_base64?: string; after_image_url?: string;
  demo_key?: string; skip_cache?: boolean;
}) {
  const before = await loadImage({ image_base64: input.before_image_base64, image_url: input.before_image_url });
  const after = await loadImage({ image_base64: input.after_image_base64, image_url: input.after_image_url });
  const cached = () =>
    input.skip_cache ? null : lookupVerify(input.demo_key, sha256(before.bytes), sha256(after.bytes));

  let v: Verify | null = null;
  let source: Source = "none";

  if (cfg().forceCache) {
    const hit = cached();
    if (hit) { v = hit; source = "cache"; }
  }
  let aiErrors: string[] = [];
  if (!v) {
    const r = await runJson(
      VERIFY_PROMPT,
      [{ mime: before.mime, b64: before.b64 }, { mime: after.mime, b64: after.b64 }],
      validateVerify
    );
    aiErrors = r.errors;
    if (r.data) { v = r.data; source = r.source; }
  }
  if (!v) {
    const hit = cached();
    if (hit) { v = hit; source = "cache"; }
  }
  if (!v) {
    // Honest failure: never guess. The citizen decides.
    v = { verdict: "unclear", confidence: 0, reason: "AI verification was unavailable. Please compare the photos yourself.", same_location: "unsure" };
    source = "none";
  }
  const out = applyVerifyRules(v, cfg().verifyMinConfidence);
  return { ...out, suggested_action: ACTION[out.verdict], source, prompt_version: VERIFY_PROMPT_VERSION, ...(source === "none" || source === "cache" ? { ai_errors: aiErrors } : {}) };
}

// ------------------------------------------------------------------ 3. LETTER
const ROLE = { 1: "Assigned Officer", 2: "Ward Officer", 3: "Zonal Officer", 4: "Municipal Commissioner" } as const;
const DEFAULT_TONE: Record<1 | 2 | 3 | 4, Tone> = { 1: "polite", 2: "sla_breach", 3: "sla_breach", 4: "formal" };

export async function writeLetter(raw: any) {
  const i = validateLetterInput(raw);
  const tone: Tone = i.tone ?? DEFAULT_TONE[i.level];
  const addressed_to = i.addressed_to ?? ROLE[i.level];
  const wrap = (subject: string, body: string) => `To: ${addressed_to}\nSubject: ${subject}\n\n${body}`;
  const base = { level: i.level, language: i.language, tone, addressed_to, complaint_id: i.complaint_id };

  let aiErrors: string[] = [];
  if (!cfg().forceCache) {
    const r = await runJson(letterPrompt(i, tone, addressed_to), [], validateLetterOut);
    aiErrors = r.errors;
    // Plain-code check: AI must keep the key facts, otherwise we don't trust the letter.
    if (r.data && r.data.body.includes(i.complaint_id) && r.data.body.length >= 40 && r.data.body.length <= 3000) {
      return { ...base, subject: r.data.subject, letter_text: wrap(r.data.subject, r.data.body), source: r.source, prompt_version: LETTER_PROMPT_VERSION };
    }
    if (r.data) {
      aiErrors.push("letter rejected: missing complaint id or bad length");
      console.error("[ai] letter rejected: missing complaint id or bad length, using template");
    }
  }
  const t = renderTemplate(i, tone);
  return { ...base, subject: t.subject, letter_text: wrap(t.subject, t.body), source: "template" as Source, prompt_version: "template_v1", ai_errors: aiErrors };
}