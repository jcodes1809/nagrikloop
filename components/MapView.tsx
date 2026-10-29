"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { ACTIVE, CATEGORIES, STATUS_META, WARDS, type Complaint } from "@/lib/data";

interface Props {
  items: Complaint[]; height: number | string; onSelect?: (id: string) => void;
  pick?: { lat: number; lng: number } | null; onPick?: (lat: number, lng: number) => void; showWards?: boolean;
}

const COLOR: Record<string, string> = { slate: "#64748b", blue: "#2563eb", amber: "#e8890c", violet: "#6c4bc1", green: "#1f8a4c", red: "#c8372d" };

export default function MapView({ items, height, onSelect, pick, onPick, showWards }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const cbSel = useRef(onSelect); cbSel.current = onSelect;
  const cbPick = useRef(onPick); cbPick.current = onPick;

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default as unknown as typeof import("leaflet");
      if (dead || !el.current || map.current) return;
      LRef.current = L;
      const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: true }).setView([17.385, 78.4867], 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      m.on("click", (e) => cbPick.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      setTimeout(() => m.invalidateSize(), 350);
      setReady(true);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; layer.current = null; setReady(false); };
  }, []);

  useEffect(() => {
    const L = LRef.current, g = layer.current, m = map.current;
    if (!ready || !L || !g || !m) return;
    g.clearLayers();
    if (showWards) WARDS.forEach((w) => L.circleMarker([w.lat, w.lng], { radius: 5, color: "#0f6b63", weight: 2, fillColor: "#fff", fillOpacity: 1 }).bindTooltip(w.name, { direction: "top" }).addTo(g));
    items.forEach((c) => {
      const col = COLOR[STATUS_META[c.status].tone];
      if (ACTIVE.includes(c.status) && (c.severity === "high" || c.severity === "critical"))
        L.circle([c.lat, c.lng], { radius: c.severity === "critical" ? 420 : 280, color: col, weight: 1, fillColor: col, fillOpacity: 0.14 }).addTo(g);
      const icon = L.divIcon({ className: "pin-wrap", html: `<div class="pin" style="background:${col}"><span>${CATEGORIES[c.category].emoji}</span></div>`, iconSize: [34, 40], iconAnchor: [17, 38] });
      const mk = L.marker([c.lat, c.lng], { icon, title: c.title }).addTo(g);
      const box = document.createElement("div");
      const t = document.createElement("strong"); t.textContent = c.title;
      const s = document.createElement("div"); s.textContent = `${c.ward} · ${STATUS_META[c.status].label}`;
      const b = document.createElement("button"); b.textContent = "Open details"; b.className = "pop-btn"; b.onclick = () => cbSel.current?.(c.id);
      box.append(t, s, b); mk.bindPopup(box);
    });
    if (pick) L.marker([pick.lat, pick.lng], { icon: L.divIcon({ className: "pin-wrap", html: `<div class="pin pick"><span>📍</span></div>`, iconSize: [34, 40], iconAnchor: [17, 38] }) }).addTo(g);
    if (!pick && items.length > 1) {
      const b = L.latLngBounds(items.map((c) => [c.lat, c.lng] as [number, number]));
      if (b.isValid()) m.fitBounds(b.pad(0.35), { maxZoom: 14, animate: true });
    } else if (pick) m.setView([pick.lat, pick.lng], Math.max(m.getZoom(), 13), { animate: true });
  }, [ready, items, pick, showWards]);

  return <div ref={el} className="map" style={{ height }} aria-label="Map of complaints in Hyderabad" />;
}
