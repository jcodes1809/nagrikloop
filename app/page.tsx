"use client";

import { useEffect, useState } from "react";

type Escalation = {
  id: string;
  level?: number;
  status?: string;
  letter?: string;
  content?: string;
  approved?: boolean;
};

type Complaint = {
  id: string;
  description?: string;
  ward?: string;
  category?: string;
  severity?: string;
  status?: string;
  escalation_level?: number;
  lat?: number;
  lng?: number;
  photo_url?: string;
  citizen_decision?: string;
  verifications?: Array<{ verdict?: string; citizen_decision?: string }>;
  escalations?: Escalation[];
};

async function api(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }
  return data;
}

async function getComplaints(): Promise<Complaint[]> {
  const data = await api("/backend/complaints");
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.complaints)) return data.complaints;
  if (Array.isArray(data.data)) return data.data;
  throw new Error("Unexpected complaints response. Check the backend response format.");
}

async function uploadPhoto(file: File): Promise<string> {
  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Please choose a photo smaller than 4 MB.");
  }
  const form = new FormData();
  form.append("file", file);
  const data = await api("/backend/upload", { method: "POST", body: form });
  const url = data.url || data.photo_url;
  if (!url) throw new Error("Upload succeeded but the response contained no photo URL.");
  return url;
}

export default function Home() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [description, setDescription] = useState("");
  const [ward, setWard] = useState("");
  const [category, setCategory] = useState("Road");
  const [severity, setSeverity] = useState("medium");
  const [photo, setPhoto] = useState<File | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setComplaints(await getComplaints());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load complaints.");
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  async function report(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) return setMessage("Please select a complaint photo.");
    if (!lat || !lng) return setMessage("Please capture or enter the location coordinates.");

    setBusy(true);
    setMessage("");
    try {
      const photo_url = await uploadPhoto(photo);
      const result = await api("/backend/complaints/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_url,
          lat: Number(lat),
          lng: Number(lng),
          ward,
          category,
          severity,
          description,
        }),
      });
      setMessage(`Complaint submitted successfully. ID: ${result.id || "created"}`);
      setDescription("");
      setPhoto(null);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Complaint submission failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, decision: "accept" | "reject") {
    setBusy(true);
    try {
      await api("/backend/verify/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaint_id: id, decision }),
      });
      setMessage(`Your decision (${decision}) was submitted.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decision failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    setBusy(true);
    try {
      await api(`/backend/escalations/${encodeURIComponent(id)}/approve`, {
        method: "POST",
      });
      setMessage("Escalation approval submitted.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) return setMessage("Geolocation is not supported by this browser.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setMessage("Location captured.");
      },
      () => setMessage("Location unavailable. Allow browser location access or enter coordinates manually."),
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-5 text-zinc-900">
      <header className="rounded-2xl bg-emerald-950 p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">NagrikLoop</p>
        <h1 className="mt-2 text-3xl font-bold">Your city. Your voice.</h1>
        <p className="mt-2 text-emerald-100">Report civic issues and track accountability using live backend data.</p>
        <a className="mt-4 inline-block underline" href="/portal">Open officer portal →</a>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold">Report a civic issue</h2>
        <form onSubmit={report} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Issue description
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border p-3" rows={3} placeholder="Describe the problem..." />
          </label>
          <label className="grid gap-1 text-sm">Ward
            <input required value={ward} onChange={(e) => setWard(e.target.value)}
              className="rounded-lg border p-3" placeholder="Enter ward" />
          </label>
          <label className="grid gap-1 text-sm">Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border p-3">
              <option>Road</option><option>Garbage</option><option>Water</option>
              <option>Drainage</option><option>Streetlight</option><option>Other</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Severity
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border p-3">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Complaint photo (max 4 MB)
            <input required type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </label>
          <div className="grid gap-2 text-sm">
            <button type="button" onClick={locate} className="w-fit rounded-lg border px-3 py-2">
              Capture my location
            </button>
            <div className="grid grid-cols-2 gap-2">
              <label>Latitude<input required type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className="w-full rounded-lg border p-2" /></label>
              <label>Longitude<input required type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className="w-full rounded-lg border p-2" /></label>
            </div>
          </div>
          <button disabled={busy} className="rounded-lg bg-emerald-800 p-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">
            {busy ? "Please wait..." : "Submit complaint"}
          </button>
        </form>
        {message && <p role="status" className="mt-4 rounded-lg bg-zinc-100 p-3 text-sm">{message}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Live complaints</h2>
          <button onClick={() => void refresh()} className="rounded-lg border px-3 py-2 text-sm">Refresh</button>
        </div>
        {complaints.length === 0 && <p className="rounded-xl border p-4 text-zinc-600">No complaints returned by the backend yet.</p>}
        {complaints.map((c) => {
          const latest = c.verifications?.[c.verifications.length - 1];
          const verdict = latest?.verdict;
          const shownStatus = verdict === "fixed" ? "RESOLVED" :
            verdict === "not_fixed" ? "STILL PRESENT" :
            verdict === "unclear" ? "UNCERTAIN" : c.status || "SUBMITTED";
          return (
            <article key={c.id} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm">{c.id}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold">{shownStatus}</span>
              </div>
              <p className="font-medium">{c.description || c.category || "Civic complaint"}</p>
              <p className="text-sm text-zinc-600">
                Ward: {c.ward || "—"} · Escalation level: {c.escalation_level ?? 0}
              </p>
              {c.lat != null && c.lng != null &&
                <a className="text-sm underline" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}>View complaint location</a>}
              {c.photo_url && <a className="block text-sm underline" href={c.photo_url} target="_blank" rel="noreferrer">View complaint photo</a>}
              {latest && <p className="text-sm">Latest verification: {verdict || "pending"} · Citizen decision: {latest.citizen_decision || c.citizen_decision || "pending"}</p>}
              {c.status === "SLA_BREACHED" || c.status === "ESCALATED" ?
                <p className="text-sm font-semibold text-red-700">Accountability status: {c.status}</p> : null}
              {latest && verdict && (
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={() => void decide(c.id, "accept")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">Citizen: Accept</button>
                  <button disabled={busy} onClick={() => void decide(c.id, "reject")} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">Citizen: Reject</button>
                </div>
              )}
              {c.escalations?.map((e) => (
                <div key={e.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
                  <p>Escalation {e.level ?? ""} · {e.status || (e.approved ? "APPROVED" : "Pending approval")}</p>
                  {(e.letter || e.content) && <p className="my-2 whitespace-pre-wrap">{e.letter || e.content}</p>}
                  {!e.approved && <button disabled={busy} onClick={() => void approve(e.id)} className="rounded-lg bg-zinc-900 px-3 py-2 text-white">Approve escalation letter</button>}
                </div>
              ))}
            </article>
          );
        })}
      </section>
    </main>
  );
}
