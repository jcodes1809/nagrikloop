// Lets through: the cron (Bearer secret), ?key=secret for manual testing,
// and the portal's own buttons (same-origin browser requests).
// Demo-grade protection, not bank-grade.
export function checkAccess(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // not configured, so open (local dev)
  if (req.headers.get("authorization") === `Bearer ${secret}`) return null;
  if (new URL(req.url).searchParams.get("key") === secret) return null;
  if (req.headers.get("sec-fetch-site") === "same-origin") return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
