import { json } from "../../../../lib/ai/respond";
import { cfg } from "../../../../lib/ai/config";
import cache from "../../../../data/demo_cache.json";

export const runtime = "nodejs";

// Shows what is configured (true/false only, never the secrets). Open /api/ai/health in the browser.
export async function GET() {
  const c = cfg();
  const store: any = cache;
  return json({
    ok: true,
    gemini: { key: !!c.geminiKey, model: !!c.geminiModel },
    groq: { key: !!c.groqKey, text_model: !!c.groqTextModel, vision_model: !!c.groqVisionModel, whisper_model: !!c.groqWhisperModel },
    route_secret_set: !!c.routeSecret,
    force_cache: c.forceCache,
    allow_default_cache: c.allowDefaultCache,
    cache_entries: {
      analyze: Object.keys(store.analyze ?? {}).filter((k) => !k.startsWith("_")).length,
      verify: Object.keys(store.verify ?? {}).filter((k) => !k.startsWith("_")).length,
    },
  });
}
