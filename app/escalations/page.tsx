"use client";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ACTIVE, CATEGORIES, LEVELS, SEV_RANK, slaText, type Complaint } from "@/lib/data";
import { FIXED_SCENE, PROBLEM_SCENE, fileToJpeg } from "@/lib/scenes";
import { useResolve } from "@/lib/actions";
import { useStore } from "@/lib/store";
import { LetterCard } from "@/components/Drawer";
import { Photo } from "@/components/Illustrations";

function PortalRow({ c }: { c: Complaint }) {
  const { dispatch, now, say } = useStore();
  const resolve = useResolve();
  const [busy, setBusy] = useState(false);
  const run = async (after: string) => { setBusy(true); await resolve(c, after); setBusy(false); };
  async function upload(f?: File) {
    if (!f) return;
    try { await run(await fileToJpeg(f)); } catch (e) { say(e instanceof Error ? e.message : "Photo problem"); }
  }
  return (
    <div className="prow">
      <div className="pthumb"><Photo src={c.photo} alt={c.title} /></div>
      <div className="pinfo"><strong>{c.title}</strong><small>{c.ref} · {c.ward} · {c.status.replace("_", " ").toLowerCase()}</small></div>
      <div className="pact">
        {c.status === "SUBMITTED" && <button className="btn" onClick={() => dispatch({ type: "status", id: c.id, status: "ACKNOWLEDGED", text: "Portal: Acknowledged by officer", now })}>Acknowledge</button>}
        {c.status === "ACKNOWLEDGED" && <button className="btn" onClick={() => dispatch({ type: "status", id: c.id, status: "IN_PROGRESS", text: "Portal: Work started", now })}>Start work</button>}
        {(c.status === "IN_PROGRESS" || c.status === "REOPENED" || c.status === "ACKNOWLEDGED") && <>
          <button className="btn primary" disabled={busy} onClick={() => run(FIXED_SCENE[c.category])}>{busy ? "Checking…" : "✅ Resolve (really fixed)"}</button>
          <button className="btn danger" disabled={busy} onClick={() => run(PROBLEM_SCENE[c.category])}>🤥 Resolve (fake)</button>
          <label className="btn filebtn">📷 Own photo<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} /></label>
        </>}
        {c.status === "RESOLVED_PENDING" && <span className="badge violet">Waiting for citizen</span>}
        {c.status === "CLOSED" && <span className="badge green">Closed</span>}
      </div>
    </div>
  );
}

export default function Escalations() {
  const { state, now } = useStore();
  const [copied, setCopied] = useState(false);
  const active = state.items.filter((c) => ACTIVE.includes(c.status));
  const letters = useMemo(() => state.items.flatMap((c) => c.letters.map((l) => ({ c, l }))).sort((a, b) => b.l.at - a.l.at), [state.items]);
  const daily = useMemo(() => active.slice().sort((a, b) => SEV_RANK.indexOf(b.severity) - SEV_RANK.indexOf(a.severity) || (a.createdAt + a.slaHours * 3.6e6) - (b.createdAt + b.slaHours * 3.6e6)), [active]);

  const wa = () => `*NagrikLoop · Today's priority list (${new Date(now).toLocaleDateString("en-IN")})*\n\n` + daily.map((c, i) => `${i + 1}. ${c.title} - ${c.ward}\n   ${c.ref} | ${c.severity.toUpperCase()} | ${slaText(c, now).text}${c.flags.length ? " | near school/hospital/hostel" : ""}`).join("\n");
  async function copy() { try { await navigator.clipboard.writeText(wa()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }

  return (
    <div className="page">
      <div className="phead"><div><p className="eyebrow">Accountability</p><h1>Escalations</h1><p className="muted">Deadlines are enforced by plain code. AI writes the letters. You approve every one.</p></div></div>

      <section className="ladder">
        {LEVELS.map((l, i) => {
          const n = active.filter((c) => c.level === l.n).length;
          return (
            <motion.div key={l.n} className={`rung ${n ? "has" : ""}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <small>Level {l.n}</small><b>{n}</b><span>{l.tone}</span><em>{l.to}</em>
            </motion.div>
          );
        })}
      </section>

      <div className="cols">
        <section className="card">
          <div className="chead"><div><h2>Outbox</h2><p className="muted">Drafts wait for your OK. Nothing leaves this demo.</p></div></div>
          <div className="lettersbox">
            <AnimatePresence initial={false}>
              {letters.slice(0, 12).map(({ c, l }) => (
                <motion.div key={l.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="lfor">{c.ref} · {c.title}</div><LetterCard id={c.id} l={l} collapsed />
                </motion.div>
              ))}
            </AnimatePresence>
            {letters.length === 0 && <div className="empty">No letters yet. Press “+3d” on the time machine to watch the agent escalate.</div>}
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <div className="chead"><div><h2>Mock GHMC officer portal</h2><p className="muted">Play the officer. Try a fake closure.</p></div></div>
            {state.items.filter((c) => c.status !== "CLOSED").map((c) => <PortalRow key={c.id} c={c} />)}
          </section>

          <section className="card">
            <div className="chead"><div><h2>Officer’s priority list</h2><p className="muted">A sorted work-list for the ward team.</p></div>
              <button className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy for WhatsApp"}</button></div>
            <ol className="daily">{daily.slice(0, 6).map((c) => (
              <li key={c.id}><b>{CATEGORIES[c.category].emoji} {c.title}</b><small>{c.ward} · {c.severity} · {slaText(c, now).text}</small></li>
            ))}</ol>
          </section>
        </div>
      </div>
    </div>
  );
}
