import { db } from "./supabase";

const ROLE: Record<number, string> = {
  1: "Assigned Officer",
  2: "Ward Officer",
  3: "Zonal Officer",
  4: "Municipal Commissioner",
};
const TONE: Record<number, string> = {
  1: "polite",
  2: "sla_breach",
  3: "formal",
  4: "formal",
};

// Template letter for now. Swap for Member 1's AI letter endpoint later.
function templateLetter(c: any, level: number) {
  return `To: ${ROLE[level]}

Subject: ${level === 1 ? "Reminder" : "Escalation (Level " + level + ")"}: ${c.category} complaint in ${c.ward}

Complaint ID: ${c.portal_id ?? c.id}
Issue: ${c.description ?? c.category}
SLA deadline: ${c.sla_deadline}

This complaint has crossed its resolution deadline without being resolved. We request urgent action and an update.

Regards,
A concerned citizen (via NagrikLoop)`;
}

export async function draftEscalations(c: any, target: number): Promise<number[]> {
  const from = (c.escalation_level ?? 0) + 1;
  const made: number[] = [];
  for (let level = from; level <= target; level++) {
    const { error } = await db.from("escalations").insert({
      complaint_id: c.id,
      level,
      language: "en",
      tone: TONE[level],
      letter: templateLetter(c, level),
      approved: false,
    });
    if (!error) made.push(level);
  }
  if (made.length) {
    await db.from("complaints").update({ escalation_level: Math.max(...made) }).eq("id", c.id);
  }
  return made;
}
