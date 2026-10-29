"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Drawer } from "./Drawer";
import { ReportModal } from "./ReportModal";

const NAV = [
  { href: "/", label: "Overview", icon: "🏠" },
  { href: "/complaints", label: "Complaints", icon: "📋" },
  { href: "/map", label: "Live Map", icon: "🗺️" },
  { href: "/escalations", label: "Escalations", icon: "📣" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { state, openReport, timeTravel, resetDemo, toast } = useStore();
  const path = usePathname();
  const days = Math.round(state.clock / 86400000 * 10) / 10;
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="logo">🔁</span><div><strong>NagrikLoop</strong><small>Hyderabad · Every complaint gets a follow-through</small></div></div>
        <nav>
          {NAV.map((n) => {
            const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`nav ${on ? "on" : ""}`}>
                {on && <motion.span layoutId="navpill" className="pill" transition={{ type: "spring", damping: 30, stiffness: 380 }} />}
                <span className="ni">{n.icon}</span><span className="nl">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidefoot">
          <p className="quote">“File once. We follow through.”</p>
          <small>Demo build · mock GHMC portal · no real officials are contacted</small>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div className="crumb">NAGRIKLOOP · HYDERABAD</div>
          <motion.button className="btn primary" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => openReport(true)}>＋ Report issue</motion.button>
        </header>
        {state.ready ? children : <div className="loading">Loading your city…</div>}
      </main>

      <nav className="bottom" aria-label="Main">
        {NAV.map((n) => <Link key={n.href} href={n.href} className={(n.href === "/" ? path === "/" : path.startsWith(n.href)) ? "on" : ""}><span>{n.icon}</span>{n.label}</Link>)}
      </nav>

      <div className="dock" aria-label="Demo time machine">
        <span className="dl">⏩ Time machine{days > 0 ? ` +${days}d` : ""}</span>
        {[1, 3, 7].map((d) => <button key={d} onClick={() => timeTravel(d * 24)}>+{d}d</button>)}
        <button onClick={resetDemo} title="Restore demo data">↺ Reset</button>
      </div>

      <ReportModal />
      <Drawer />
      <AnimatePresence>{toast && <motion.div key={toast} className="toast" role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>
    </div>
  );
}
