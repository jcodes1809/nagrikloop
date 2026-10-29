import { db } from "@/lib/supabase";

const H = 3600 * 1000;

export async function GET() {
  // Remove old seed rows so running this twice doesn't duplicate
  const { data: old } = await db.from("complaints").select("id").like("portal_id", "GHMC-SEED%");
  const oldIds = (old ?? []).map((r) => r.id);
  if (oldIds.length) {
    await db.from("escalations").delete().in("complaint_id", oldIds);
    await db.from("verifications").delete().in("complaint_id", oldIds);
    await db.from("status_events").delete().in("complaint_id", oldIds);
    await db.from("portal_complaints").delete().in("complaint_id", oldIds);
    await db.from("complaints").delete().in("id", oldIds);
  }

  const seeds = [
    { portal: "GHMC-SEED001", ward: "LB Nagar", desc: "Garbage pile near primary school", status: "ACKNOWLEDGED", portalStatus: "ACKNOWLEDGED", deadlineH: 60 },
    { portal: "GHMC-SEED002", ward: "Dilsukhnagar", desc: "Overflowing bin, not cleared for days", status: "SLA_BREACHED", portalStatus: "ACKNOWLEDGED", deadlineH: -5 },
    { portal: "GHMC-SEED003", ward: "Kothapet", desc: "Garbage dumped by the roadside", status: "RESOLVED_PENDING_VERIFICATION", portalStatus: "RESOLVED", deadlineH: -20 },
  ];

  const out: string[] = [];
  for (const s of seeds) {
    const { data: c, error } = await db.from("complaints").insert({
      ward: s.ward,
      category: "garbage",
      severity: "high",
      description: s.desc,
      status: s.status,
      portal_id: s.portal,
      sla_deadline: new Date(Date.now() + s.deadlineH * H).toISOString(),
      escalation_level: 0,
    }).select().single();
    if (error || !c) { out.push(`${s.portal}: ${error?.message}`); continue; }
    await db.from("portal_complaints").insert({ id: s.portal, complaint_id: c.id, status: s.portalStatus });
    await db.from("status_events").insert({ complaint_id: c.id, status: "SUBMITTED" });
    await db.from("status_events").insert({ complaint_id: c.id, status: s.status });
    out.push(`${s.portal}: ok`);
  }
  return Response.json({ seeded: out });
}
