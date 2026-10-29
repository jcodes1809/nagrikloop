import { db } from "@/lib/supabase";
import { setStatus } from "@/lib/status";
import { draftEscalations } from "@/lib/escalate";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST { id, decision: "accept" | "reject" }
export async function POST(req: Request) {
  const { id, decision } = await req.json();
  if (!id || !["accept", "reject"].includes(decision)) {
    return Response.json({ error: "id and decision (accept|reject) required" }, { status: 400 });
  }

  const { data: c } = await db.from("complaints").select("*").eq("id", id).single();
  if (!c) return Response.json({ error: "not found" }, { status: 404 });
  if (c.status !== "RESOLVED_PENDING_VERIFICATION") {
    return Response.json({ error: `cannot decide while status is ${c.status}` }, { status: 409 });
  }

  // Attach the citizen's decision to the latest verification row (create one if AI verify hasn't run)
  const { data: v } = await db.from("verifications").select("id")
    .eq("complaint_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const mark = async (d: string) => {
    if (v) await db.from("verifications").update({ citizen_decision: d }).eq("id", v.id);
    else await db.from("verifications").insert({ complaint_id: id, citizen_decision: d });
  };

  if (decision === "accept") {
    await mark("ACCEPTED");
    await setStatus(id, "CLOSED");
    return Response.json({ ok: true, status: "CLOSED" });
  }

  // Reject: reopen, reset the mock portal so track doesn't flip it back, escalate with proof
  await mark("REJECTED");
  await setStatus(id, "REOPENED");
  await db.from("portal_complaints")
    .update({ status: "IN_PROGRESS", updated_at: new Date().toISOString() })
    .eq("id", c.portal_id);

  const target = Math.min(4, (c.escalation_level ?? 0) + 1);
  const made = await draftEscalations(c, target, { falseClosure: true });
  await setStatus(id, "ESCALATED");
  return Response.json({ ok: true, status: "ESCALATED", letters: made });
}
