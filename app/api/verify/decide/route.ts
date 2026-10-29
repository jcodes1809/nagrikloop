import { db } from "@/lib/supabase";
import { setStatus } from "@/lib/status";
import { draftEscalations } from "@/lib/escalate";

// Body: { complaint_id, decision: "accept" | "reject" }
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.complaint_id || !["accept", "reject"].includes(b.decision)) {
    return Response.json({ error: "complaint_id and decision (accept|reject) required" }, { status: 400 });
  }

  // Save decision on the latest verification
  const { data: v } = await db
    .from("verifications").select("id")
    .eq("complaint_id", b.complaint_id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (v) await db.from("verifications").update({ citizen_decision: b.decision }).eq("id", v.id);

  if (b.decision === "accept") {
    await setStatus(b.complaint_id, "CLOSED");
    return Response.json({ ok: true, status: "CLOSED" });
  }

  // Reject: reopen, reset portal, auto-escalate one level up
  await setStatus(b.complaint_id, "REOPENED");
  await db.from("portal_complaints").update({ status: "ACKNOWLEDGED" }).eq("complaint_id", b.complaint_id);
  const { data: c } = await db.from("complaints").select("*").eq("id", b.complaint_id).single();
  if (c) {
    await draftEscalations(c, Math.min(4, (c.escalation_level ?? 0) + 1));
    await setStatus(c.id, "ESCALATED");
  }
  return Response.json({ ok: true, status: "ESCALATED" });
}
