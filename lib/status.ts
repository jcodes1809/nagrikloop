import { db } from "./supabase";

// The ONLY place complaint status changes. Plain code controls status, not AI.
const ALLOWED: Record<string, string[]> = {
  SUBMITTED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "SLA_BREACHED", "RESOLVED_PENDING_VERIFICATION"],
  IN_PROGRESS: ["SLA_BREACHED", "RESOLVED_PENDING_VERIFICATION"],
  SLA_BREACHED: ["ESCALATED", "RESOLVED_PENDING_VERIFICATION"],
  ESCALATED: ["RESOLVED_PENDING_VERIFICATION"],
  RESOLVED_PENDING_VERIFICATION: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "ESCALATED", "SLA_BREACHED", "RESOLVED_PENDING_VERIFICATION"],
  CLOSED: [],
};

// Returns true if the change was applied. Invalid changes are skipped, not thrown,
// so the cron job never crashes. Use { force: true } only for seed/reset code.
export async function setStatus(
  id: string,
  status: string,
  opts: { force?: boolean } = {}
): Promise<boolean> {
  const { data: cur } = await db.from("complaints").select("status").eq("id", id).single();
  const from: string | undefined = cur?.status;

  if (from === status) return false;
  if (!opts.force && from && !(ALLOWED[from] ?? []).includes(status)) {
    console.warn(`setStatus blocked: ${id} ${from} -> ${status}`);
    return false;
  }

  const { error } = await db.from("complaints").update({ status }).eq("id", id);
  if (error) { console.error("setStatus update failed", error.message); return false; }

  await db.from("status_events").insert({ complaint_id: id, status });
  return true;
}
