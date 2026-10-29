import { db } from "@/lib/supabase";
import { setStatus } from "@/lib/status";

// Body: { complaint_id, after_photo_url }
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
  return Response.json({ ok: true });
}
