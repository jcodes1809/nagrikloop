import { db } from "./supabase";
import { nowDemo } from "./clock";
import { writeLetter } from "./ai/service";

const ROLE: Record<number, string> = {
  1: "Assigned Officer",
  2: "Ward Officer",
  3: "Zonal Officer",
  4: "Municipal Commissioner",
};
const TONE: Record<number, string> = { 1: "polite", 2: "sla_breach", 3: "sla_breach", 4: "formal" };

// Last-resort letter if the AI layer itself throws. Member 1's service already
// falls back to its own multilingual templates, so this should rarely run.
function plainLetter(c: any, level: number) {
  return `To: ${ROLE[level]}

Subject: ${level === 1 ? "Reminder" : "Escalation (Level " + level + ")"}: ${c.category} complaint in ${c.ward}

Complaint ID: ${c.portal_id ?? c.id}
Issue: ${c.description ?? c.category}
SLA deadline: ${c.sla_deadline}

This complaint has crossed its resolution deadline without being resolved. We request urgent action and an update.

Regards,
A concerned citizen (via NagrikLoop)`;
}

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race<T>([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("letter timeout")), ms))]);

type Opts = { language?: "en" | "hi" | "te"; falseClosure?: boolean };

// Creates any missing letters up to `target` level. Returns the levels created.
export async function draftEscalations(c: any, target: number, opts: Opts = {}): Promise<number[]> {
  const now = await nowDemo();
  const day = 86400000;
  const filed = new Date(c.created_at ?? now).getTime();
  const deadline = c.sla_deadline ? new Date(c.sla_deadline).getTime() : now.getTime();
  const { data: ex } = await db.from("escalations").select("level").eq("complaint_id", c.id); const from = Math.max(c.escalation_level ?? 0, ...(ex ?? []).map((r: any) => r.level)) + 1;
  const made: number[] = [];

  for (let level = from; level <= target; level++) {
    let letter = "";
    let tone = TONE[level];
    let language = opts.language ?? "en";
    try {
      const out: any = await withTimeout(
        writeLetter({
          complaint_id: c.portal_id ?? c.id,
          description: c.description ?? "garbage not cleared",
          location_text: c.ward ? `${c.ward}, Hyderabad` : "the reported location",
          ward: c.ward ?? "",
          filed_at: new Date(filed).toISOString().slice(0, 10),
          sla_days: Math.max(1, Math.round((deadline - filed) / day)),
          days_open: Math.max(0, Math.floor((now.getTime() - filed) / day)),
          days_overdue: Math.max(0, Math.floor((now.getTime() - deadline) / day)),
          level,
          language,
          false_closure: opts.falseClosure === true,
        }),
        30000
      );
      letter = out.letter_text;
      tone = out.tone ?? tone;
    } catch (e: any) {
      console.error("[escalate] AI letter failed, using plain template:", e?.message ?? e);
      letter = plainLetter(c, level);
    }

    const { error } = await db.from("escalations").insert({
      complaint_id: c.id, level, language, tone, letter, approved: false,
    });
    if (error) console.error("[escalate] insert failed:", error.message); else made.push(level);
  }
  if (made.length) {
    await db.from("complaints").update({ escalation_level: Math.max(...made) }).eq("id", c.id);
  }
  return made;
}
