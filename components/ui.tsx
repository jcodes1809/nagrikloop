"use client";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, FLAGS, STATUS_META, health, slaText, type Complaint } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Photo } from "./Illustrations";

export function CountUp({ value }: { value: number }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current, dur = 700; let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur); const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (value - a) * e)); if (p < 1) raf = requestAnimationFrame(step); else from.current = value;
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{v}</>;
}

export function Badge({ status }: { status: Complaint["status"] }) {
  const m = STATUS_META[status];
  return <span className={`badge ${m.tone}`}>{m.label}</span>;
}

export function Ring({ value }: { value: number }) {
  const r = 17, c = 2 * Math.PI * r; const col = value >= 70 ? "var(--green)" : value >= 40 ? "var(--saffron)" : "var(--rose)";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-label={`Health ${value} of 100`}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
      <motion.circle cx="22" cy="22" r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" transform="rotate(-90 22 22)"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 0.9, ease: "easeOut" }} />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">{value}</text>
    </svg>
  );
}

export function ComplaintCard({ c, i = 0 }: { c: Complaint; i?: number }) {
  const { now, select } = useStore();
  const sla = slaText(c, now);
  return (
    <motion.button layout className="ccard" onClick={() => select(c.id)}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(i, 8) * 0.05, type: "spring", damping: 26, stiffness: 260 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
      <div className="thumb"><Photo src={c.photo} alt={c.title} /></div>
      <div className="cbody">
        <div className="crow"><strong className="ctitle">{c.title}</strong><Badge status={c.status} /></div>
        <div className="cmeta">{CATEGORIES[c.category].emoji} {CATEGORIES[c.category].label} · {c.ward} · {c.ref}</div>
        <div className="tags">
          {c.flags.map((f) => <span key={f} className="tag">{FLAGS[f].emoji} {FLAGS[f].label}</span>)}
          {c.fakeCaught && c.status !== "CLOSED" && <span className="tag bad">🚨 Fake closure caught</span>}
          {c.level > 0 && c.status !== "CLOSED" && <span className="tag warn">⬆ Level {c.level}</span>}
        </div>
        <div className={`csla ${sla.breached ? "breach" : ""}`}>{sla.text} · 🤝 {c.supporters} neighbours</div>
      </div>
      <Ring value={health(c, now)} />
    </motion.button>
  );
}

export function Skeleton() {
  return <div className="skel"><div /><div /><div /></div>;
}
