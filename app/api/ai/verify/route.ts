import { handle, json, readJson } from "../../../../lib/ai/respond";
import { requireAuth } from "../../../../lib/ai/auth";
import { verifyFix } from "../../../../lib/ai/service";

export const runtime = "nodejs";
export const maxDuration = 40;

const str = (v: any) => (typeof v === "string" ? v : undefined);

export async function POST(req: Request) {
  return handle(async () => {
    requireAuth(req);
    const b = await readJson(req);
    const out = await verifyFix({
      before_image_base64: str(b.before_image_base64), before_image_url: str(b.before_image_url),
      after_image_base64: str(b.after_image_base64), after_image_url: str(b.after_image_url),
      demo_key: str(b.demo_key), skip_cache: b.skip_cache === true,
    });
    return json(out);
  });
}
