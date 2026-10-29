import { db } from "@/lib/supabase";

// Body: { complaint_id, verdict? }
// TODO: replace the stub with Member 1's verify route (before + after photos).
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.complaint_id) return Response.json({ error: "complaint_id required" }, { status: 400 });

  const verdict = b.verdict ?? "LIKELY_FIXED"; // use "NOT_FIXED" to demo a fake closure
  const confidence = verdict === "NOT_FIXED" ? 0.91 : 0.88;
  const reason =
    verdict === "NOT_FIXED"
      ? "After-photo still shows garbage at the location."
      : "Garbage appears cleared in the after-photo.";

  const { data, error } = await db
    .from("verifications")
    .insert({ complaint_id: b.complaint_id, verdict, confidence, reason })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, verification: data });
}
