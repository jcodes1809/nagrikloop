"use client";
import { motion } from "motion/react";
import { ACTIVE, STATUS_META } from "@/lib/data";
import { useStore } from "@/lib/store";
import MapView from "@/components/MapView";

const LEGEND = [["slate", "Submitted"], ["blue", "Acknowledged"], ["amber", "In progress"], ["violet", "Verify fix"], ["red", "Reopened"], ["green", "Closed"]];

export default function MapPage() {
  const { state, select } = useStore();
  const hot = state.items.filter((c) => ACTIVE.includes(c.status) && (c.severity === "high" || c.severity === "critical")).length;
  return (
    <div className="page">
      <div className="phead"><div><p className="eyebrow">Hyderabad</p><h1>Live map</h1><p className="muted">Pins are complaints. Shaded circles are high-priority hotspots ({hot} right now).</p></div></div>
      <motion.div className="mapcard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <MapView items={state.items} height="62vh" onSelect={select} showWards />
        <div className="legend">{LEGEND.map(([t, l]) => <span key={l}><i className={`dotc ${t}`} />{l}</span>)}</div>
      </motion.div>
      <p className="muted small">Map tiles © OpenStreetMap contributors. Tap a pin, then “Open details”. Statuses: {Object.values(STATUS_META).map((m) => m.label).join(", ")}.</p>
    </div>
  );
}
