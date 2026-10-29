import { db } from "@/lib/supabase";
import { setStatus } from "@/lib/status";
import { POST as runVerify } from "@/app/api/verify/route";

export const runtime = "nodejs";
export const maxDuration = 60;

// Body: { complaint_id, after_photo_url, demo_key?, verdict? }
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.complaint_id) return Response.json({ error: "complaint_id required" }, { status: 400 });

  const { error } = await db
    .from("portal_complaints")
    .update({
      status: "RESOLVED",
      after_photo_url: b.after_photo_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("complaint_id", b.complaint_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await setStatus(b.complaint_id, "RESOLVED_PENDING_VERIFICATION");

  // Run the AI before/after check. Never let a failure block the officer's click.
  let verification: any = null;
  try {
    const r = await runVerify(new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint_id: b.complaint_id, demo_key: b.demo_key, verdict: b.verdict }),
    }));
    verification = await r.json();
  } catch (e: any) {
    console.error("[resolve] auto-verify failed:", e?.message ?? e);
  }
  return Response.json({ ok: true, verification });
}
