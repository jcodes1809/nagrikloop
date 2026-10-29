// Guard is OFF unless ENFORCE_GUARD=1 is set. The secret alone no longer locks anything.
export function checkAccess(req: Request): Response | null {
  if (process.env.ENFORCE_GUARD !== "1") return null;
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return null;
  if (new URL(req.url).searchParams.get("key") === secret) return null;
  if (req.headers.get("sec-fetch-site") === "same-origin") return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
