export type Category = "garbage" | "pothole" | "streetlight" | "water" | "drain";
export type Status = "SUBMITTED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED_PENDING" | "CLOSED" | "REOPENED";
export type Severity = "low" | "medium" | "high" | "critical";
export type Flag = "school" | "hospital" | "hostel";

export interface Ward { name: string; lat: number; lng: number }
export interface Letter {
  id: string; at: number; level: number; to: string; subject: string; body: string; state: "draft" | "sent";
}
export interface Verdict {
  result: "resolved" | "still_present" | "uncertain"; confidence: number; reason: string; source: "ai" | "fallback";
}
export interface EventItem { at: number; text: string; kind: "info" | "warn" | "ok" | "bad" }
export interface Complaint {
  id: string; ref: string; title: string; category: Category; ward: string; lat: number; lng: number;
  description: string; severity: Severity; flags: Flag[]; status: Status;
  createdAt: number; since: number; baseLevel: number; level: number; slaHours: number;
  photo: string; afterPhoto?: string; verdict?: Verdict;
  supporters: number; thanks: number; fakeCaught: boolean; closedAt?: number;
  events: EventItem[]; letters: Letter[];
}

export const WARDS: Ward[] = [
  { name: "LB Nagar", lat: 17.3457, lng: 78.5522 },
  { name: "Dilsukhnagar", lat: 17.3688, lng: 78.5247 },
  { name: "Kothapet", lat: 17.3616, lng: 78.5400 },
  { name: "Saroornagar", lat: 17.3547, lng: 78.5260 },
  { name: "Charminar", lat: 17.3616, lng: 78.4747 },
  { name: "Secunderabad", lat: 17.4399, lng: 78.4983 },
  { name: "Banjara Hills", lat: 17.4126, lng: 78.4482 },
  { name: "Madhapur", lat: 17.4486, lng: 78.3908 },
];

export const CATEGORIES: Record<Category, { label: string; emoji: string; sla: number }> = {
  garbage: { label: "Garbage & waste", emoji: "🗑️", sla: 48 },
  pothole: { label: "Pothole / road", emoji: "🕳️", sla: 120 },
  streetlight: { label: "Streetlight", emoji: "💡", sla: 72 },
  water: { label: "Water leak", emoji: "💧", sla: 24 },
  drain: { label: "Drain / sewage", emoji: "🌊", sla: 36 },
};

export const FLAGS: Record<Flag, { label: string; emoji: string }> = {
  school: { label: "Near a school", emoji: "🏫" },
  hospital: { label: "Near a hospital", emoji: "🏥" },
  hostel: { label: "Near a women's hostel / bus stop", emoji: "🚌" },
};

export const STATUS_META: Record<Status, { label: string; tone: string }> = {
  SUBMITTED: { label: "Submitted", tone: "slate" },
  ACKNOWLEDGED: { label: "Acknowledged", tone: "blue" },
  IN_PROGRESS: { label: "In progress", tone: "amber" },
  RESOLVED_PENDING: { label: "Verify fix", tone: "violet" },
  CLOSED: { label: "Closed ✓", tone: "green" },
  REOPENED: { label: "Reopened", tone: "red" },
};

export const LEVELS = [
  { n: 0, to: "Citizen filed", tone: "Filed" },
  { n: 1, to: "Assigned Sanitary Inspector / Junior Engineer", tone: "Polite reminder" },
  { n: 2, to: "Ward / Circle Deputy Commissioner", tone: "SLA breach notice" },
  { n: 3, to: "Zonal Commissioner", tone: "Formal escalation" },
  { n: 4, to: "Commissioner & Grievance Cell", tone: "Final escalation" },
];

export const SEV_RANK: Severity[] = ["low", "medium", "high", "critical"];
export const ACTIVE: Status[] = ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS", "REOPENED"];

export const H = 3600 * 1000;

export function wardByName(n: string): Ward { return WARDS.find((w) => w.name === n) ?? WARDS[0]; }

export function computeSeverity(base: Severity, flags: Flag[]): Severity {
  const i = Math.min(3, SEV_RANK.indexOf(base) + flags.length);
  return SEV_RANK[i];
}

export function stepsFor(elapsedH: number, sla: number): number {
  if (elapsedH < sla * 0.5) return 0;
  if (elapsedH < sla) return 1;
  if (elapsedH < sla * 2) return 2;
  if (elapsedH < sla * 3) return 3;
  return 4;
}

export function targetLevel(c: Complaint, now: number): number {
  return Math.min(4, c.baseLevel + stepsFor((now - c.since) / H, c.slaHours));
}

export function health(c: Complaint, now: number): number {
  if (c.status === "CLOSED") return 100;
  const over = Math.max(0, (now - c.createdAt) / H - c.slaHours);
  let s = 100 - Math.min(55, over * 1.2) - c.level * 8 - (c.status === "REOPENED" ? 10 : 0);
  return Math.round(Math.max(5, Math.min(100, s)));
}

export function fmtDur(ms: number): string {
  const a = Math.abs(ms) / H;
  if (a < 1) return `${Math.max(1, Math.round(a * 60))}m`;
  if (a < 48) return `${Math.round(a)}h`;
  return `${Math.round(a / 24)}d`;
}

export function slaText(c: Complaint, now: number): { text: string; breached: boolean } {
  if (c.status === "CLOSED") return { text: "Resolved & verified", breached: false };
  const left = c.createdAt + c.slaHours * H - now;
  return left >= 0
    ? { text: `${fmtDur(left)} left in SLA`, breached: false }
    : { text: `SLA breached by ${fmtDur(left)}`, breached: true };
}

export function ago(at: number, now: number): string {
  const d = now - at;
  if (d < 60000) return "just now";
  return `${fmtDur(d)} ago`;
}

export function makeLetter(c: Complaint, level: number, now: number, extra?: string): Letter {
  const L = LEVELS[level];
  const age = fmtDur(now - c.createdAt);
  const flagTxt = c.flags.length ? ` The location is ${c.flags.map((f) => FLAGS[f].label.toLowerCase()).join(" and ")}.` : "";
  const evid = extra ? `\n\nEvidence note: ${extra}` : "";
  const open = level === 1
    ? "Greetings. This is a gentle reminder regarding the complaint below."
    : level === 2
    ? "The service-level deadline for the complaint below has passed without a verified resolution."
    : level === 3
    ? "This complaint has remained unresolved despite two earlier notices and is now formally escalated."
    : "This is the final escalation. The complaint remains unresolved after all earlier levels.";
  const body = `${open}\n\nComplaint ${c.ref} (${CATEGORIES[c.category].label}) at ${c.ward}, Hyderabad.\nFiled ${age} ago. SLA: ${c.slaHours}h. Severity: ${c.severity}.${flagTxt}\n\n"${c.description}"${evid}\n\nKindly share the assigned officer, action taken, and the expected resolution date. A photo of the completed work from the same spot will let the citizen verify and close this case.\n\nRegards,\nNagrikLoop on behalf of the citizen`;
  return {
    id: `${c.id}-L${level}-${Math.round(now)}`, at: now, level, to: L.to,
    subject: `[${L.tone}] ${c.ref} - ${CATEGORIES[c.category].label}, ${c.ward}`, body, state: "draft",
  };
}

let seq = 0;
function mk(p: Partial<Complaint> & Pick<Complaint, "title" | "category" | "ward" | "description" | "severity" | "status" | "photo">, ageH: number, now: number): Complaint {
  const w = wardByName(p.ward);
  const sla = CATEGORIES[p.category].sla;
  seq += 1;
  const created = now - ageH * H;
  return {
    id: `NL-${1040 + seq}`, ref: `GHMC-${48210 + seq * 37}`, lat: w.lat + (seq % 3) * 0.003 - 0.003, lng: w.lng + (seq % 4) * 0.002 - 0.003,
    flags: [], createdAt: created, since: created, baseLevel: 0, level: 0, slaHours: sla,
    supporters: 3 + seq * 2, thanks: 0, fakeCaught: false, events: [], letters: [], ...p,
  } as Complaint;
}

export function seedData(now: number): Complaint[] {
  seq = 0;
  const a = mk({ title: "Garbage overflowing near bus stop", category: "garbage", ward: "LB Nagar", description: "Garbage bins overflowing for days near the bus stop. Stray dogs and a bad smell.", severity: "high", flags: ["hostel"], status: "IN_PROGRESS", photo: "scene:garbage" }, 20, now);
  a.events = [
    { at: a.createdAt, text: "Complaint filed by citizen", kind: "info" },
    { at: a.createdAt + 2 * H, text: `Submitted to Mock GHMC Portal as ${a.ref}`, kind: "info" },
    { at: a.createdAt + 9 * H, text: "Portal: Acknowledged by Sanitary Inspector", kind: "ok" },
    { at: a.createdAt + 15 * H, text: "Portal: Work in progress", kind: "ok" },
  ];
  const b = mk({ title: "Streetlight not working", category: "streetlight", ward: "Dilsukhnagar", description: "Streetlight on the main lane has been dark for a week. Women return late from work here.", severity: "high", flags: ["hostel"], status: "ACKNOWLEDGED", photo: "scene:light" }, 30, now);
  b.events = [
    { at: b.createdAt, text: "Complaint filed by citizen", kind: "info" },
    { at: b.createdAt + 1 * H, text: `Submitted to Mock GHMC Portal as ${b.ref}`, kind: "info" },
    { at: b.createdAt + 12 * H, text: "Portal: Acknowledged", kind: "ok" },
  ];
  const c = mk({ title: "Road pothole requires repair", category: "pothole", ward: "Kothapet", description: "Deep pothole on the service road. Two-wheelers are slipping, especially at night.", severity: "medium", status: "CLOSED", photo: "scene:pothole", afterPhoto: "scene:cleanroad", thanks: 14 }, 150, now);
  c.closedAt = now - 20 * H; c.supporters = 22;
  c.events = [
    { at: c.createdAt, text: "Complaint filed by citizen", kind: "info" },
    { at: c.createdAt + 30 * H, text: "Portal: Resolved with photo", kind: "ok" },
    { at: c.closedAt, text: "Citizen verified the fix. Case closed ✓", kind: "ok" },
  ];
  const d = mk({ title: "Garbage dump next to government school", category: "garbage", ward: "Saroornagar", description: "A large garbage heap right outside the school gate. Children walk through it every morning.", severity: "critical", flags: ["school"], status: "RESOLVED_PENDING", photo: "scene:garbage", afterPhoto: "scene:garbage" }, 80, now);
  d.level = 2; d.fakeCaught = true;
  d.verdict = { result: "still_present", confidence: 91, source: "fallback", reason: "The after-photo still shows a large pile of garbage bags at the school gate. The claimed fix does not match the original issue." };
  d.letters = [{ ...makeLetter(d, 1, d.createdAt + 25 * H), state: "sent" }, { ...makeLetter(d, 2, d.createdAt + 49 * H), state: "sent" }];
  d.events = [
    { at: d.createdAt, text: "Complaint filed by citizen", kind: "info" },
    { at: d.createdAt + 25 * H, text: "Reminder sent to Sanitary Inspector (Level 1)", kind: "warn" },
    { at: d.createdAt + 49 * H, text: "SLA breached. Escalated to Deputy Commissioner (Level 2)", kind: "warn" },
    { at: now - 2 * H, text: "Portal marked RESOLVED with an after-photo", kind: "info" },
    { at: now - 2 * H + 60000, text: "AI check: garbage still present (91% sure). Fake closure suspected", kind: "bad" },
  ];
  const e = mk({ title: "Water pipe leaking on the road", category: "water", ward: "Charminar", description: "Drinking water pipe leaking near the old market. Water is being wasted since morning.", severity: "medium", status: "SUBMITTED", photo: "scene:water" }, 5, now);
  e.events = [
    { at: e.createdAt, text: "Complaint filed by citizen", kind: "info" },
    { at: e.createdAt + 1 * H, text: `Submitted to Mock GHMC Portal as ${e.ref}`, kind: "info" },
  ];
  return [d, a, b, e, c];
}
