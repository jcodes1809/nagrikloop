import { timingSafeEqual } from "node:crypto";
import { cfg } from "./config";
import { HttpError } from "./errors";

// If AI_ROUTE_SECRET is set, callers must send header  x-internal-key: <secret>
export function requireAuth(req: Request) {
  const secret = cfg().routeSecret;
  if (!secret) return; // open (fine for local dev; set a secret before deploying!)
  const got = req.headers.get("x-internal-key") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, "Unauthorized");
}
