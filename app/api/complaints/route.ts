import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: complaints, error } = await db
    .from("complaints").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (complaints ?? []).map((c) => c.id);
  const [ev, es, vf, pc] = await Promise.all([
    db.from("status_events").select("*").in("complaint_id", ids).order("at"),
    db.from("escalations").select("*").in("complaint_id", ids).order("level"),
    db.from("verifications").select("*").in("complaint_id", ids).order("created_at"),
    db.from("portal_complaints").select("*").in("complaint_id", ids),
  ]);

  const by = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.complaint_id === id);

  return Response.json({
    complaints: (complaints ?? []).map((c) => ({
      ...c,
      events: by(ev.data, c.id),
      escalations: by(es.data, c.id),
      verifications: by(vf.data, c.id),
      portal: by(pc.data, c.id)[0] ?? null,
    })),
  });
}
