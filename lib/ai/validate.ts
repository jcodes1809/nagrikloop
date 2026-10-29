import { HttpError } from "./errors";

export type Analyze = {
  is_garbage: boolean;
  category: "garbage" | "other";
  severity: number; // 1-5
  description: string;
  confidence: number; // 0-100
  visible_context: string;
};

export type Verify = {
  verdict: "fixed" | "not_fixed" | "unclear";
  confidence: number; // 0-100
  reason: string;
  same_location: "yes" | "no" | "unsure";
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const asNum = (x: any, name: string) => {
  const n = typeof x === "string" ? Number(x) : x;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`${name} is not a number`);
  return n;
};
// Models sometimes answer confidence as 0.85 instead of 85. Treat 0<x<=1 as a fraction.
const asPercent = (x: any, name: string) => {
  const n = asNum(x, name);
  return n > 0 && n <= 1 ? n * 100 : n;
};
const asStr = (x: any, name: string) => {
  if (typeof x !== "string" || !x.trim()) throw new Error(`${name} is not a non-empty string`);
  return x.trim();
};

export function validateAnalyze(x: any): Analyze {
  if (!x || typeof x !== "object") throw new Error("not an object");
  if (typeof x.is_garbage !== "boolean") throw new Error("is_garbage must be boolean");
  const severity = Math.round(clamp(asNum(x.severity, "severity"), 1, 5));
  const confidence = Math.round(clamp(asPercent(x.confidence, "confidence"), 0, 100));
  return {
    is_garbage: x.is_garbage,
    category: x.is_garbage ? "garbage" : "other",
    severity,
    description: asStr(x.description, "description").slice(0, 400),
    confidence,
    visible_context: typeof x.visible_context === "string" ? x.visible_context.trim().slice(0, 120) : "",
  };
}

export function validateVerify(x: any): Verify {
  if (!x || typeof x !== "object") throw new Error("not an object");
  if (!["fixed", "not_fixed", "unclear"].includes(x.verdict)) throw new Error("bad verdict");
  const same = ["yes", "no", "unsure"].includes(x.same_location) ? x.same_location : "unsure";
  return {
    verdict: x.verdict,
    confidence: Math.round(clamp(asPercent(x.confidence, "confidence"), 0, 100)),
    reason: asStr(x.reason, "reason").slice(0, 500),
    same_location: same,
  };
}

export function validateLetterOut(x: any): { subject: string; body: string } {
  if (!x || typeof x !== "object") throw new Error("not an object");
  return { subject: asStr(x.subject, "subject").slice(0, 200), body: asStr(x.body, "body") };
}

export type Lang = "en" | "hi" | "te";
export type Tone = "polite" | "sla_breach" | "formal";
export type LetterInput = {
  complaint_id: string;
  description: string;
  location_text: string;
  ward: string;
  filed_at: string;
  sla_days: number;
  days_open: number;
  days_overdue: number;
  level: 1 | 2 | 3 | 4;
  language: Lang;
  tone?: Tone;
  false_closure: boolean;
  addressed_to?: string;
};

export function validateLetterInput(b: any): LetterInput {
  if (!b || typeof b !== "object") throw new HttpError(400, "JSON body required");
  const level = Number(b.level);
  if (![1, 2, 3, 4].includes(level)) throw new HttpError(400, "level must be 1, 2, 3 or 4");
  const language = b.language ?? "en";
  if (!["en", "hi", "te"].includes(language)) throw new HttpError(400, "language must be en, hi or te");
  if (b.tone !== undefined && !["polite", "sla_breach", "formal"].includes(b.tone))
    throw new HttpError(400, "tone must be polite, sla_breach or formal");
  const id = b.complaint_id !== undefined && b.complaint_id !== null ? String(b.complaint_id).trim() : "";
  if (!id) throw new HttpError(400, "complaint_id required");
  const n = (v: any, d: number) => (Number.isFinite(Number(v)) && v !== null && v !== "" && v !== undefined ? Number(v) : d);
  const s = (v: any, d: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : d);
  return {
    complaint_id: id,
    description: s(b.description, "garbage not cleared"),
    location_text: s(b.location_text, "the reported location"),
    ward: s(b.ward, ""),
    filed_at: s(b.filed_at, ""),
    sla_days: n(b.sla_days, 3),
    days_open: n(b.days_open, 0),
    days_overdue: Math.max(0, n(b.days_overdue, 0)),
    level: level as 1 | 2 | 3 | 4,
    language,
    tone: b.tone,
    false_closure: b.false_closure === true,
    addressed_to: typeof b.addressed_to === "string" && b.addressed_to.trim() ? b.addressed_to.trim().slice(0, 120) : undefined,
  };
}
