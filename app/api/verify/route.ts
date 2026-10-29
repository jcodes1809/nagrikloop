import { db } from "@/lib/supabase";
import { verifyFix } from "@/lib/ai/service";

export const runtime = "nodejs";
export const maxDuration = 60;

// Body: { complaint_id, demo_key?, verdict? }
// - Normal path: compares complaints.photo_url (before) with portal_complaints.after_photo_url (after)
//   using Member 1's verifyFix (Gemini -> Groq -> cache -> honest "unclear").
// - Manual demo path: no photos on file? pass verdict = "not_fixed" | "fixed" | "unclear".
// Stored verdict values: fixed | not_fixed | unclear. Confidence is 0-100.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!b.complaint_id) return Response.json({ error: "complaint_id required" }, { status: 400 });

  const { data: c } = await db.from("complaints").select("id, photo_url").eq("id", b.complaint_id).maybeSingle();
  if (!c) return Response.json({ error: "complaint not found" }, { status: 404 });
  const { data: p } = await db.from("portal_complaints").select("after_photo_url").eq("complaint_id", c.id).maybeSingle();

  const manual = typeof b.verdict === "string" ? b.verdict.toLowerCase() : null;
  let out: any;

  if (manual) {
    const verdict = manual.includes("not") ? "not_fixed" : manual === "unclear" ? "unclear" : "fixed";
    out = {
      verdict,
      confidence: verdict === "not_fixed" ? 91 : verdict === "fixed" ? 88 : 40,
      reason: verdict === "not_fixed" ? "After-photo still shows garbage at the location."
        : verdict === "fixed" ? "Garbage appears cleared in the after-photo."
        : "Photos are not conclusive.",
      source: "manual",
      location_mismatch: false,
      suggested_action: verdict === "not_fixed" ? "reopen_and_escalate" : verdict === "fixed" ? "citizen_confirm_close" : "ask_citizen",
    };
  } else {
    if (!c.photo_url || !p?.after_photo_url) {
      return Response.json(
        { error: "Need a before photo (complaints.photo_url) and an after photo (portal after_photo_url). For a manual demo pass verdict." },
        { status: 400 }
      );
    }
    try {
      out = await verifyFix({ before_image_url: c.photo_url, after_image_url: p.after_photo_url, demo_key: b.demo_key });
    } catch (e: any) {
      return Response.json({ error: e?.message ?? "verify failed" }, { status: e?.status ?? 500 });
    }
  }

  const { data, error } = await db
    .from("verifications")
    .insert({ complaint_id: c.id, verdict: out.verdict, confidence: out.confidence, reason: out.reason })
    .select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    ok: true,
    verification: data,
    source: out.source,
    location_mismatch: out.location_mismatch ?? false,
    suggested_action: out.suggested_action,
  });
}
