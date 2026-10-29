// PROMPT: escalation letter.  Version-locked.
import type { LetterInput, Tone } from "../lib/ai/validate";

export const LETTER_PROMPT_VERSION = "letter_v1";

const LANG_NAME = { en: "English", hi: "Hindi (Devanagari script)", te: "Telugu (Telugu script)" } as const;

const TONE_RULES: Record<Tone, string> = {
  polite: "Polite and courteous reminder. Assume good faith. Ask for a status update.",
  sla_breach: "Firm but respectful. State clearly that the deadline was missed and ask for action within 48 hours, otherwise the case goes to the next officer.",
  formal: "Formal notice. Neutral, official wording. Ask for a written reply stating the action taken and the responsible officer.",
};

export const letterPrompt = (i: LetterInput, tone: Tone, addressedTo: string) => `You write complaint-follow-up letters to Indian municipal officials on behalf of a citizen.

Write the letter in ${LANG_NAME[i.language]}.
Tone: ${TONE_RULES[tone]}

Use ONLY these facts (do not invent anything else):
- Addressed to: ${addressedTo}
- Complaint ID: ${i.complaint_id}
- Issue: ${i.description}
- Location: ${i.location_text}${i.ward ? ` (${i.ward})` : ""}
- Filed on: ${i.filed_at || "not given"}
- Days open: ${i.days_open}
- Promised resolution time (SLA): ${i.sla_days} days
- Days past the deadline: ${i.days_overdue}
- Authority marked it resolved but photo check shows the issue persists: ${i.false_closure ? "YES (mention this clearly; photo evidence is on record)" : "no"}

Rules:
- The body MUST include the complaint ID, the location and the filing date (if given).
- Do NOT cite any law, act, rule or right. Do NOT invent names, deadlines, phone numbers or numbers not listed above.
- No threats, no insults. Respectful and specific.
- Body at most 170 words. End with the sign-off "On behalf of the citizen, NagrikLoop" translated into the letter language.

Return ONLY one JSON object: {"subject": string, "body": string}`;
