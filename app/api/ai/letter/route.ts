import { handle, json, readJson } from "../../../../lib/ai/respond";
import { requireAuth } from "../../../../lib/ai/auth";
import { writeLetter } from "../../../../lib/ai/service";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  return handle(async () => {
    requireAuth(req);
    const b = await readJson(req);
    return json(await writeLetter(b));
  });
}
