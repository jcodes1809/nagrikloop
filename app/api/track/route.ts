import { db } from "@/lib/supabase";
import { nowDemo } from "@/lib/clock";
import { setStatus } from "@/lib/status";
import { draftEscalations } from "@/lib/escalate";
import { checkAccess } from "@/lib/guard";

export async function GET(req: Request) {
  const denied = checkAccess(req);
  if (denied) return denied;

  const now = await nowDemo();
  const { data: list } = await db
    .from("complaints").select("*")
    .in("status", ["ACKNOWLEDGED", "IN_PROGRESS", "SLA_BREACHED", "ESCALATED"]);

  const changes: string[] = [];
  for (const c of list ?? []) {
    const { data: p } = await db.from("portal_complaints").select("*").eq("id", c.portal_id).single();
    let status: string = c.status;

    if (p?.status === "RESOLVED") status = "RESOLVED_PENDING_VERIFICATION";
    else if (p?.status === "IN_PROGRESS" && status === "ACKNOWLEDGED") status = "IN_PROGRESS";

    if (["ACKNOWLEDGED", "IN_PROGRESS"].includes(status) && c.sla_deadline && now > new Date(c.sla_deadline)) {
      status = "SLA_BREACHED";
    }

    if (status !== c.status) {
      await setStatus(c.id, status);
      changes.push(`${c.id}: ${c.status} -> ${status}`);
    }

    if (["SLA_BREACHED", "ESCALATED"].includes(status) && c.sla_deadline) {
      const overdueH = (now.getTime() - new Date(c.sla_deadline).getTime()) / 3600000;
      const target = Math.min(4, 1 + Math.floor(Math.max(0, overdueH) / 48));
      const made = await draftEscalations(c, target);
      if (made.length) {
        changes.push(`${c.id}: drafted letter level ${made.join(",")}`);
        if (status === "SLA_BREACHED") {
          await setStatus(c.id, "ESCALATED");
          changes.push(`${c.id}: SLA_BREACHED -> ESCALATED`);
        }
      }
    }
  }
  return Response.json({ now, changes });
}
