"use client";
import { useCallback } from "react";
import type { Complaint, Verdict } from "./data";
import { useStore } from "./store";

export function useResolve() {
  const { dispatch, now, say } = useStore();
  return useCallback(async (c: Complaint, after: string) => {
    let verdict: Verdict = { result: "uncertain", confidence: 50, source: "fallback", reason: "Could not reach the checker. Citizen decides." };
    try {
      const r = await fetch("/api/verify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ before: c.photo, after, category: c.category }),
      });
      if (r.ok) { const j = await r.json(); if (j && j.result) verdict = j as Verdict; }
    } catch { /* keep fallback */ }
    dispatch({ type: "resolve", id: c.id, after, verdict, now });
    say(verdict.result === "still_present" ? "🚨 AI caught a fake closure!" : verdict.result === "resolved" ? "AI says it looks fixed. Citizen to confirm." : "AI is unsure. Citizen decides.");
  }, [dispatch, now, say]);
}
