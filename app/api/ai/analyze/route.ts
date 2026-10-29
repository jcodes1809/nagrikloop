import { handle, json, readJson } from "../../../../lib/ai/respond";
import { requireAuth } from "../../../../lib/ai/auth";
import { analyzePhoto } from "../../../../lib/ai/service";

export const runtime = "nodejs";
export const maxDuration = 30;

const num = (v: any) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const str = (v: any) => (typeof v === "string" ? v : undefined);

export async function POST(req: Request) {
  return handle(async () => {
    requireAuth(req);
    const b = await readJson(req);
    const out = await analyzePhoto({
      image_base64: str(b.image_base64), image_url: str(b.image_url),
      lat: num(b.lat), lng: num(b.lng), note: str(b.note),
      demo_key: str(b.demo_key), skip_cache: b.skip_cache === true,
    });
    return json(out);
  });
}
