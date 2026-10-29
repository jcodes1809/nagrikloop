"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, FLAGS, WARDS, computeSeverity, wardByName, type Category, type Complaint, type Flag, type Severity } from "@/lib/data";
import { fileToJpeg } from "@/lib/scenes";
import { useStore } from "@/lib/store";
import MapView from "./MapView";
import { Photo } from "./Illustrations";

const SAMPLES: { k: string; label: string }[] = [
  { k: "scene:garbage", label: "Garbage" }, { k: "scene:pothole", label: "Pothole" }, { k: "scene:light", label: "Dark light" },
  { k: "scene:water", label: "Leak" }, { k: "scene:drain", label: "Drain" },
];
const SCENE_CAT: Record<string, Category> = { "scene:garbage": "garbage", "scene:pothole": "pothole", "scene:light": "streetlight", "scene:water": "water", "scene:drain": "drain" };

export function ReportModal() {
  const { state, ui, openReport, dispatch, select, say, now } = useStore();
  const [problem, setProblem] = useState("");
  const [category, setCategory] = useState<Category>("garbage");
  const [ward, setWard] = useState("Saroornagar");
  const [pos, setPos] = useState<{ lat: number; lng: number }>({ lat: wardByName("Saroornagar").lat, lng: wardByName("Saroornagar").lng });
  const [desc, setDesc] = useState("");
  const [flags, setFlags] = useState<Flag[]>([]);
  const [photo, setPhoto] = useState("scene:garbage");
  const [base, setBase] = useState<Severity>("medium");
  const [lang, setLang] = useState("en-IN");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const rec = useRef<{ stop: () => void } | null>(null);

  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") openReport(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [openReport]);
  useEffect(() => { if (!ui.reportOpen) { rec.current?.stop(); setListening(false); } }, [ui.reportOpen]);

  function pickWard(n: string) { setWard(n); const w = wardByName(n); setPos({ lat: w.lat, lng: w.lng }); }
  function toggle(f: Flag) { setFlags((a) => (a.includes(f) ? a.filter((x) => x !== f) : [...a, f])); }

  async function onFile(f: File | undefined) {
    if (!f) return; setErr("");
    try { setPhoto(await fileToJpeg(f)); } catch (e) { setErr(e instanceof Error ? e.message : "Photo problem"); }
  }

  function voice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setErr("Voice typing works in Chrome or Edge. You can type instead."); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); r.lang = lang; r.interimResults = false; r.continuous = false;
    r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => { const t = e.results[0][0].transcript; setProblem((p) => (p ? p + " " : "") + t); };
    r.onend = () => setListening(false); r.onerror = () => { setListening(false); setErr("Could not hear that. Try again."); };
    rec.current = r; setListening(true); setErr(""); r.start();
  }

  function locate() {
    if (!navigator.geolocation) { setErr("Location is not available in this browser."); return; }
    navigator.geolocation.getCurrentPosition((p) => {
      const lat = p.coords.latitude, lng = p.coords.longitude;
      let best = WARDS[0], d = 1e9;
      WARDS.forEach((w) => { const x = (w.lat - lat) ** 2 + (w.lng - lng) ** 2; if (x < d) { d = x; best = w; } });
      setWard(best.name); setPos({ lat, lng }); say(`📍 Nearest ward: ${best.name}`);
    }, () => setErr("Location permission was denied."), { timeout: 8000 });
  }

  async function ai() {
    if (problem.trim().length < 3) { setErr("Type or speak the problem first."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: problem }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "AI is busy");
      setCategory(j.category); setBase(j.severity); setDesc(j.description);
      setAiNote(j.source === "ai" ? "✨ Filled by Gemini" : "✨ Filled by built-in assistant (add a Gemini key for full AI)");
    } catch (e) { setErr(e instanceof Error ? e.message : "AI is busy"); }
    setBusy(false);
  }

  function submit() {
    const p = problem.trim();
    if (p.length < 3) { setErr("Please describe the problem."); return; }
    const title = p.length > 70 ? p.slice(0, 67) + "..." : p;
    const created = now;
    let id = ""; do { id = `NL-${1100 + Math.floor(Math.random() * 8900)}`; } while (state.items.some((x) => x.id === id));
    const ref = `GHMC-${10000 + Math.floor(Math.random() * 89999)}`;
    const c: Complaint = {
      id, ref, title, category, ward, lat: pos.lat, lng: pos.lng, description: (desc.trim() || p).slice(0, 500),
      severity: computeSeverity(base, flags), flags, status: "SUBMITTED", createdAt: created, since: created, baseLevel: 0, level: 0,
      slaHours: CATEGORIES[category].sla, photo, supporters: 1, thanks: 0, fakeCaught: false, letters: [],
      events: [
        { at: created, text: "Complaint filed by citizen", kind: "info" },
        { at: created + 1000, text: `Submitted to Mock GHMC Portal as ${ref}`, kind: "info" },
      ],
    };
    dispatch({ type: "add", c });
    openReport(false); setProblem(""); setDesc(""); setFlags([]); setBase("medium"); setAiNote(""); setErr("");
    say(`✅ Filed as ${ref}. We will follow up until it is fixed.`);
    setTimeout(() => select(id), 350);
  }

  const parts = ui.reportOpen ? [
    <motion.div key="o" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => openReport(false)} />,
    <motion.div key="m" className="modal" role="dialog" aria-label="Report a civic issue" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }} transition={{ type: "spring", damping: 30, stiffness: 340 }}>
      <div className="dhead">
        <div><div className="eyebrow">Citizen report</div><h2>Report a civic issue</h2><p className="muted">Tell us what needs attention. We will track it until it is truly fixed.</p></div>
        <button className="x" onClick={() => openReport(false)} aria-label="Close">✕</button>
      </div>
      <div className="dscroll">
        <label className="lab">What is the problem?</label>
        <div className="row">
          <input className="inp" value={problem} maxLength={300} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. Garbage heap outside the school gate" />
          <button className={`btn ${listening ? "danger" : ""}`} onClick={voice} aria-label="Voice input">{listening ? "⏺ Listening" : "🎤"}</button>
        </div>
        <div className="row small-row">
          <select className="inp slim" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Voice language">
            <option value="en-IN">English</option><option value="te-IN">తెలుగు</option><option value="hi-IN">हिन्दी</option>
          </select>
          <button className="btn warm" disabled={busy} onClick={ai}>{busy ? "Thinking…" : "✨ AI fill details"}</button>
          {aiNote && <span className="muted small">{aiNote}</span>}
        </div>

        <div className="two">
          <div><label className="lab">Category</label>
            <select className="inp" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {(Object.keys(CATEGORIES) as Category[]).map((k) => <option key={k} value={k}>{CATEGORIES[k].emoji} {CATEGORIES[k].label}</option>)}
            </select></div>
          <div><label className="lab">Ward</label>
            <select className="inp" value={ward} onChange={(e) => pickWard(e.target.value)}>{WARDS.map((w) => <option key={w.name}>{w.name}</option>)}</select></div>
        </div>
        <div className="row small-row">
          <button className="btn" onClick={locate}>📍 Use my location</button>
          <button className="btn" onClick={() => setShowMap(!showMap)}>{showMap ? "Hide map" : "🗺️ Pick on map"}</button>
        </div>
        <AnimatePresence initial={false}>
          {showMap && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 210, opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <MapView items={[]} height={200} pick={pos} onPick={(lat, lng) => setPos({ lat, lng })} showWards />
          </motion.div>}
        </AnimatePresence>

        <label className="lab">Does this affect someone vulnerable? <span className="muted">(raises priority)</span></label>
        <div className="flags">
          {(Object.keys(FLAGS) as Flag[]).map((f) => (
            <button key={f} className={`chip ${flags.includes(f) ? "on" : ""}`} onClick={() => toggle(f)} aria-pressed={flags.includes(f)}>{FLAGS[f].emoji} {FLAGS[f].label}</button>
          ))}
        </div>

        <label className="lab">Description</label>
        <textarea className="inp" rows={3} maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add details, or tap ✨ AI fill details" />

        <label className="lab">Photo evidence</label>
        <div className="samples">
          {SAMPLES.map((s) => (
            <button key={s.k} className={`sample ${photo === s.k ? "on" : ""}`} onClick={() => { setPhoto(s.k); setCategory(SCENE_CAT[s.k]); }}>
              <div className="sph"><Photo src={s.k} alt={s.label} /></div><span>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="row small-row">
          <label className="btn filebtn">📷 Upload / take photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
          <span className="muted small">JPG, PNG or WebP up to 8 MB. Sample pictures are for the demo.</span>
        </div>
        {!photo.startsWith("scene:") && <div className="uploaded"><Photo src={photo} alt="Your photo" /></div>}
        {err && <div className="err" role="alert">{err}</div>}
      </div>
      <div className="mfoot">
        <button className="btn" onClick={() => openReport(false)}>Cancel</button>
        <button className="btn primary big" onClick={submit}>Create complaint →</button>
      </div>
    </motion.div>,
  ] : null;

  return <AnimatePresence>{parts}</AnimatePresence>;
}
