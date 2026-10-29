"use client";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ACTIVE, slaText } from "@/lib/data";
import { useStore } from "@/lib/store";
import { ComplaintCard } from "@/components/ui";

const FILTERS = ["All", "Active", "Needs you", "Breached", "Closed"] as const;

export default function Complaints() {
  const { state, now, openReport } = useStore();
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");

  const list = useMemo(() => state.items.filter((c) => {
    if (f === "Active" && !ACTIVE.includes(c.status)) return false;
    if (f === "Needs you" && c.status !== "RESOLVED_PENDING") return false;
    if (f === "Breached" && !(ACTIVE.includes(c.status) && slaText(c, now).breached)) return false;
    if (f === "Closed" && c.status !== "CLOSED") return false;
    const t = q.trim().toLowerCase();
    return !t || `${c.title} ${c.ward} ${c.ref} ${c.id} ${c.category}`.toLowerCase().includes(t);
  }), [state.items, f, q, now]);

  return (
    <div className="page">
      <div className="phead"><div><p className="eyebrow">Register</p><h1>Complaints</h1><p className="muted">Every case, its deadline, and what happens next.</p></div>
        <button className="btn primary" onClick={() => openReport(true)}>＋ New</button></div>
      <div className="filters">
        <input className="inp search" placeholder="Search by title, ward or ID" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} aria-label="Search complaints" />
        <div className="chips">{FILTERS.map((x) => (
          <button key={x} className={`chip ${f === x ? "on" : ""}`} onClick={() => setF(x)}>{x}{x === "Needs you" && state.items.some((c) => c.status === "RESOLVED_PENDING") ? " ●" : ""}</button>
        ))}</div>
      </div>
      <div className="clist wide">
        <AnimatePresence mode="popLayout">{list.map((c, i) => <ComplaintCard key={c.id} c={c} i={i} />)}</AnimatePresence>
        {list.length === 0 && <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Nothing here. A clean slate is a good sign 🌿</motion.div>}
      </div>
    </div>
  );
}
