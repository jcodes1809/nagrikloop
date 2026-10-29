"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { ACTIVE, H, LEVELS, makeLetter, seedData, targetLevel, type Complaint, type Verdict } from "./data";

interface State { ready: boolean; items: Complaint[]; clock: number }
type Action =
  | { type: "load"; items: Complaint[]; clock: number }
  | { type: "add"; c: Complaint }
  | { type: "status"; id: string; status: Complaint["status"]; text: string; now: number }
  | { type: "resolve"; id: string; after: string; verdict: Verdict; now: number }
  | { type: "decide"; id: string; accept: boolean; now: number }
  | { type: "support"; id: string }
  | { type: "thank"; id: string }
  | { type: "send"; id: string; letterId: string; now: number }
  | { type: "edit"; id: string; letterId: string; body: string }
  | { type: "clock"; ms: number }
  | { type: "escalate"; now: number }
  | { type: "reset"; items: Complaint[] };

function upd(s: State, id: string, f: (c: Complaint) => Complaint): State {
  return { ...s, items: s.items.map((c) => (c.id === id ? f(c) : c)) };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "load": return { ready: true, items: a.items, clock: a.clock };
    case "add": return { ...s, items: [a.c, ...s.items] };
    case "reset": return { ready: true, items: a.items, clock: 0 };
    case "clock": return { ...s, clock: s.clock + a.ms };
    case "status":
      return upd(s, a.id, (c) => ({ ...c, status: a.status, events: [...c.events, { at: a.now, text: a.text, kind: "ok" }] }));
    case "resolve":
      return upd(s, a.id, (c) => ({
        ...c, status: "RESOLVED_PENDING", afterPhoto: a.after, verdict: a.verdict,
        fakeCaught: a.verdict.result === "still_present",
        events: [
          ...c.events,
          { at: a.now, text: "Portal marked RESOLVED with an after-photo", kind: "info" },
          { at: a.now + 1000, kind: a.verdict.result === "resolved" ? "ok" : a.verdict.result === "still_present" ? "bad" : "warn",
            text: a.verdict.result === "still_present" ? `AI check: issue still present (${a.verdict.confidence}%). Fake closure suspected`
              : a.verdict.result === "resolved" ? `AI check: looks fixed (${a.verdict.confidence}%). Waiting for citizen` : `AI check: inconclusive (${a.verdict.confidence}%). Citizen decides` },
        ],
      }));
    case "decide":
      return upd(s, a.id, (c) => {
        if (a.accept) {
          return { ...c, status: "CLOSED", closedAt: a.now, events: [...c.events, { at: a.now, text: "Citizen verified the fix. Case closed ✓", kind: "ok" }] };
        }
        const level = Math.min(4, c.level + 1);
        const re = { ...c, status: "REOPENED" as const, since: a.now, baseLevel: level, level, fakeCaught: true };
        const letter = makeLetter(re, level, a.now, `Citizen REJECTED the closure. AI review: ${c.verdict?.reason ?? "issue still visible"}`);
        return { ...re, letters: [...c.letters, letter], events: [...c.events,
          { at: a.now, text: "Citizen rejected the closure. Case reopened", kind: "bad" },
          { at: a.now + 1000, text: `Auto-escalated to ${LEVELS[level].to} with evidence (Level ${level}). Draft ready`, kind: "warn" }] };
      });
    case "support": return upd(s, a.id, (c) => ({ ...c, supporters: c.supporters + 1 }));
    case "thank": return upd(s, a.id, (c) => ({ ...c, thanks: c.thanks + 1 }));
    case "send":
      return upd(s, a.id, (c) => ({
        ...c, letters: c.letters.map((l) => (l.id === a.letterId ? { ...l, state: "sent" as const } : l)),
        events: [...c.events, { at: a.now, text: "Escalation letter approved and sent to the demo outbox", kind: "info" }],
      }));
    case "edit":
      return upd(s, a.id, (c) => ({ ...c, letters: c.letters.map((l) => (l.id === a.letterId ? { ...l, body: a.body } : l)) }));
    case "escalate": {
      let changed = false;
      const items = s.items.map((c) => {
        if (!ACTIVE.includes(c.status)) return c;
        const t = targetLevel(c, a.now);
        if (t <= c.level) return c;
        changed = true;
        const letters = [...c.letters];
        const events = [...c.events];
        for (let l = c.level + 1; l <= t; l++) {
          letters.push(makeLetter(c, l, a.now));
          events.push({ at: a.now, kind: "warn", text: l === 1 ? "SLA half used. Reminder drafted (Level 1)" : `Escalated to ${LEVELS[l].to} (Level ${l}). Draft ready` });
        }
        return { ...c, level: t, letters, events };
      });
      return changed ? { ...s, items } : s;
    }
    default: return s;
  }
}

const KEY = "nagrikloop.v2";

interface Ctx {
  state: State; now: number;
  dispatch: (a: Action) => void;
  timeTravel: (hours: number) => void; resetDemo: () => void;
  ui: { reportOpen: boolean; selectedId: string | null };
  openReport: (v: boolean) => void; select: (id: string | null) => void;
  toast: string | null; say: (m: string) => void;
}
const C = createContext<Ctx | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { ready: false, items: [], clock: 0 });
  const [tick, setTick] = useState(0);
  const [ui, setUi] = useState({ reportOpen: false, selectedId: null as string | null });
  const loaded = useRef(false);

  useEffect(() => {
    let items: Complaint[] | null = null; let clock = 0;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p.items) && p.items.length) { items = p.items; clock = Number(p.clock) || 0; } }
    } catch { /* ignore */ }
    dispatch({ type: "load", items: items ?? seedData(Date.now()), clock });
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current || !state.ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({ items: state.items, clock: state.clock })); } catch { /* quota */ }
  }, [state]);

  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 20000); return () => clearInterval(t); }, []);

  const now = useMemo(() => Date.now() + state.clock, [state.clock, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.ready) dispatch({ type: "escalate", now }); }, [now, state.ready]);

  const timeTravel = useCallback((hours: number) => dispatch({ type: "clock", ms: hours * H }), []);
  const resetDemo = useCallback(() => { dispatch({ type: "reset", items: seedData(Date.now()) }); setUi({ reportOpen: false, selectedId: null }); }, []);
  const openReport = useCallback((v: boolean) => setUi((u) => ({ ...u, reportOpen: v })), []);
  const select = useCallback((id: string | null) => setUi((u) => ({ ...u, selectedId: id })), []);

  const [toast, setToast] = useState<string | null>(null);
  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast((t) => (t === m ? null : t)), 3200); }, []);

  const value = useMemo(() => ({ state, now, dispatch, timeTravel, resetDemo, ui, openReport, select, toast, say }), [state, now, timeTravel, resetDemo, ui, openReport, select, toast, say]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useStore(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useStore outside Providers");
  return v;
}
