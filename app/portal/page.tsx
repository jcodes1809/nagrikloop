"use client";

import { useCallback, useEffect, useState } from "react";

type Escalation = {
  id: string;
  level?: number;
  status?: string;
  letter?: string;
  content?: string;
  approved?: boolean;
};

type Verification = {
  verdict?: string;
  citizen_decision?: string;
};

type Complaint = {
  id: string;
  description?: string;
  ward?: string;
  category?: string;
  status?: string;
  escalation_level?: number;
  photo_url?: string | null;
  lat?: number;
  lng?: number;
  portal_id?: string;
  verifications?: Verification[];
  escalations?: Escalation[];
};

async function api(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

async function getComplaints(): Promise<Complaint[]> {
  const data = await api("/backend/complaints");

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.complaints)) return data.complaints;
  if (Array.isArray(data.data)) return data.data;

  throw new Error("Unexpected complaints response format.");
}

export default function Portal() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getComplaints();
      setComplaints(data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load complaints."
      );
    }
  }, []);

  useEffect(() => {
    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [refresh]);

  async function time(hours: number) {
    setBusy(true);

    try {
      await api("/backend/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });

      setMessage(`Time Machine advanced by ${hours} hours.`);
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Time Machine failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    const confirmed = window.confirm(
      "Reset the shared demo data? This affects backend data for everyone using this demo."
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await api("/backend/reset", { method: "POST" });
      setMessage("Backend reset requested.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Reset failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resolve(complaintId: string, file: File) {
    setBusy(true);

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file.");
      }

      if (file.size > 4 * 1024 * 1024) {
        throw new Error("Choose an after-photo smaller than 4 MB.");
      }

      const form = new FormData();
      form.append("file", file);

      const uploaded = await api("/backend/upload", {
        method: "POST",
        body: form,
      });

      const afterPhotoUrl = uploaded.url || uploaded.photo_url;

      if (!afterPhotoUrl) {
        throw new Error("Upload response contained no photo URL.");
      }

      await api("/backend/portal/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_id: complaintId,
          after_photo_url: afterPhotoUrl,
          verdict: "not_fixed",
        }),
      });

      setMessage("After-photo submitted for backend verification.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Officer resolution failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function approve(escalationId: string) {
    setBusy(true);

    try {
      await api(
        `/backend/escalations/${encodeURIComponent(escalationId)}/approve`,
        { method: "POST" }
      );

      setMessage("Escalation approval submitted.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Approval failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-5 text-zinc-900">
      <header className="rounded-2xl bg-zinc-950 p-5 text-white">
        <h1 className="text-2xl font-bold">City Operations Portal</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Officer actions and demo controls connected to the live backend.
        </p>
        <a className="mt-3 inline-block underline" href="/">
          ← Citizen dashboard
        </a>
      </header>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-bold">Demo controls</h2>

        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => void time(24)}
            className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Time Machine +24h
          </button>

          <button
            disabled={busy}
            onClick={() => void time(96)}
            className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Time Machine +96h
          </button>

          <button
            disabled={busy}
            onClick={() => void time(168)}
            className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Time Machine +168h
          </button>

          <button
            disabled={busy}
            onClick={() => void refresh()}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            Refresh complaints
          </button>

          <button
            disabled={busy}
            onClick={() => void reset()}
            className="rounded-lg bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Reset demo
          </button>
        </div>

        <p role="status" className="text-sm text-zinc-600">
          {message}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Live complaints / Outbox ({complaints.length})
        </h2>

        {complaints.length === 0 && (
          <p className="rounded-xl border p-4">
            No complaints returned by the backend yet.
          </p>
        )}

        {complaints.map((c) => (
          <article key={c.id} className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono text-sm">{c.id}</span>
              <strong>{c.status || "SUBMITTED"}</strong>
            </div>

            <h3 className="font-semibold">
              {c.description || c.category || "Civic complaint"}
            </h3>

            <p>
              Ward: {c.ward || "—"} · Escalation level:{" "}
              {c.escalation_level ?? 0}
            </p>

            {(c.status === "SLA_BREACHED" || c.status === "ESCALATED") && (
              <p className="font-semibold text-red-700">
                Accountability status: {c.status}
              </p>
            )}

            {typeof c.lat === "number" && typeof c.lng === "number" && (
              <a
                href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                target="_blank"
                rel="noreferrer"
                className="block text-sm underline"
              >
                View complaint location
              </a>
            )}

            {c.photo_url && (
              <a
                href={c.photo_url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm underline"
              >
                View complaint photo
              </a>
            )}

            <label className="block text-sm font-medium">
              Resolve / verify with after-photo (max 4 MB)
              <input
                className="mt-2 block w-full"
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  input.value = "";

                  if (file) {
                    void resolve(c.id, file);
                  }
                }}
              />
            </label>

            {c.verifications?.map((v, index) => (
              <p key={index} className="text-sm text-zinc-600">
                Verification: {v.verdict || "pending"} · Citizen decision:{" "}
                {v.citizen_decision || "pending"}
              </p>
            ))}

            {c.escalations?.length ? (
              c.escalations.map((e) => (
                <div key={e.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
                  <p>
                    Escalation {e.level ?? ""} ·{" "}
                    {e.status || (e.approved ? "APPROVED" : "Pending approval")}
                  </p>

                  {(e.letter || e.content) && (
                    <p className="my-2 whitespace-pre-wrap">
                      {e.letter || e.content}
                    </p>
                  )}

                  {!e.approved && (
                    <button
                      disabled={busy}
                      onClick={() => void approve(e.id)}
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
                    >
                      Approve letter
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                No escalation letter is currently available for this complaint.
              </p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}