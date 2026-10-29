"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CATEGORIES, FLAGS, LEVELS, ago, health, slaText, type Letter } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Photo } from "./Illustrations";
import { Badge, Ring } from "./ui";

export function LetterCard({ id, l, collapsed }: { id: string; l: Letter; collapsed?: boolean }) {
  const { dispatch, now, say } = useStore();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!collapsed && l.state === "draft");
  async function polish(lang: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: l.body, lang }) });
      const j = await r.json();
      if (j.body) { dispatch({ type: "edit", id, letterId: l.id, body: j.body }); say(j.source === "ai" ? "✨ Polished by Gemini" : "AI key not set. Kept the standard letter."); }
    } catch { say("Could not reach AI. Letter unchanged."); }
    setBusy(false);
  }
  return (
    <div className={`letter ${l.state}`}>
      <button className="lhead" onClick={() => setOpen(!open)}>
        <span><strong>Level {l.level}</strong> · {l.to}</span>
        <span className={`badge ${l.state === "sent" ? "green" : "amber"}`}>{l.state === "sent" ? "Sent (demo outbox)" : "Needs your OK"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <div className="lsub">{l.subject}</div>
            <pre className="lbody">{l.body}</pre>
            {l.state === "draft" && (
              <div className="lact">
                <button className="btn primary" onClick={() => dispatch({ type: "send", id, letterId: l.id, now })}>✅ Approve & send</button>
                <button className="btn" disabled={busy} onClick={() => polish("en")}>{busy ? "…" : "✨ Polish (EN)"}</button>
                <button className="btn" disabled={busy} onClick={() => polish("te")}>తెలుగు</button>
                <button className="btn" disabled={busy} onClick={() => polish("hi")}>हिन्दी</button>
              </div>
            )}
            <div className="lnote">Demo mode: nothing goes to real officials. Letters stay in this outbox.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Drawer() {
  const { state, now, ui, select, dispatch, say } = useStore();
  const c = state.items.find((x) => x.id === ui.selectedId);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") select(null); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [select]);

  const parts = c ? [
    <motion.div key="o" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => select(null)} />,
    <motion.aside key="a" className="drawer" role="dialog" aria-label="Complaint details" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 34, stiffness: 320 }}>
      <div className="dhead">
        <div>
          <div className="eyebrow">{c.id} · {c.ref}</div>
          <h2>{c.title}</h2>
        </div>
        <button className="x" onClick={() => select(null)} aria-label="Close">✕</button>
      </div>
      <div className="dscroll">
        <div className="crow"><Badge status={c.status} /><span className="cmeta">{CATEGORIES[c.category].emoji} {CATEGORIES[c.category].label} · {c.ward} · severity {c.severity}</span></div>
        <div className="tags">{c.flags.map((f) => <span key={f} className="tag">{FLAGS[f].emoji} {FLAGS[f].label}</span>)}</div>

        <div className={c.afterPhoto ? "pair" : "single"}>
          <figure><div className="ph"><Photo src={c.photo} alt="Before" /></div><figcaption>Before (citizen)</figcaption></figure>
          {c.afterPhoto && <figure><div className="ph"><Photo src={c.afterPhoto} alt="After" /></div><figcaption>After (portal)</figcaption></figure>}
        </div>

        <p className="desc">{c.description}</p>

        <div className="healthrow">
          <Ring value={health(c, now)} />
          <div><strong>Complaint health</strong><div className={slaText(c, now).breached ? "breach" : "muted"}>{slaText(c, now).text}</div></div>
          <div className="spacer" />
          <button className="btn" onClick={() => { dispatch({ type: "support", id: c.id }); say("Added your +1. Neighbours' voices add up 🤝"); }}>🤝 +1 I see this too · {c.supporters}</button>
        </div>

        {c.verdict && (
          <motion.div className={`verdict ${c.verdict.result}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="vtop">
              <strong>{c.verdict.result === "still_present" ? "🚨 Possible fake closure" : c.verdict.result === "resolved" ? "✅ Looks fixed" : "🤔 Inconclusive"}</strong>
              <span>AI confidence {c.verdict.confidence}%</span>
            </div>
            <p>{c.verdict.reason}</p>
            <small>{c.verdict.source === "ai" ? "Checked by Gemini vision." : "Built-in checker. Add a Gemini key for real photo analysis."} The citizen always has the final say.</small>
            {c.status === "RESOLVED_PENDING" && (
              <div className="lact">
                <button className="btn primary" onClick={() => { dispatch({ type: "decide", id: c.id, accept: true, now }); say("Thank you for verifying 🙏"); }}>✅ Yes, it is fixed</button>
                <button className="btn danger" onClick={() => { dispatch({ type: "decide", id: c.id, accept: false, now }); say("Reopened and escalated with evidence"); }}>❌ No, still not fixed</button>
              </div>
            )}
          </motion.div>
        )}

        {c.status === "CLOSED" && (
          <div className="thank">
            <div><strong>💚 Say thanks to the crew</strong><div className="muted">Sanitation and road workers rarely hear it. One tap is enough.</div></div>
            <button className="btn warm" onClick={() => { dispatch({ type: "thank", id: c.id }); say("Your thanks will reach the ward team 💚"); }}>🙏 Thank you · {c.thanks}</button>
          </div>
        )}

        {c.letters.length > 0 && <>
          <h3>Escalation letters</h3>
          {c.letters.slice().reverse().map((l) => <LetterCard key={l.id} id={c.id} l={l} />)}
        </>}

        <h3>Timeline</h3>
        <ol className="timeline">
          {c.events.slice().reverse().map((e, i) => (
            <motion.li key={i} className={e.kind} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <span className="dot" /><div><div>{e.text}</div><small>{ago(e.at, now)}</small></div>
            </motion.li>
          ))}
        </ol>
        <div className="muted small">Escalation ladder: {LEVELS.map((l) => l.n).join(" → ")} · current level {c.level}</div>
      </div>
    </motion.aside>,
  ] : null;

  return <AnimatePresence>{parts}</AnimatePresence>;
}
