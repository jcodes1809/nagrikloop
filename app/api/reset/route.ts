import { db } from "@/lib/supabase";
import { GET as seed } from "@/app/api/seed/route";

const NONE_UUID = "00000000-0000-0000-0000-000000000000";
let running = false; // blocks overlapping resets

export async function POST() {
  if (running) return Response.json({ ok: false, error: "reset already running" }, { status: 409 });
  running = true;
  try {
    const errors: string[] = [];
    const run = async (label: string, p: PromiseLike<{ error: any }>) => {
      const { error } = await p;
      if (error) errors.push(`${label}: ${error.message}`);
    };

    await run("escalations", db.from("escalations").delete().neq("id", NONE_UUID));
    await run("verifications", db.from("verifications").delete().neq("id", NONE_UUID));
    await run("status_events", db.from("status_events").delete().neq("id", NONE_UUID));
    await run("portal_complaints", db.from("portal_complaints").delete().neq("id", "__none__"));
    await run("complaints", db.from("complaints").delete().neq("id", NONE_UUID));
    await run("app_settings", db.from("app_settings").upsert({ key: "time_offset_hours", value: "0" }));

    const res = await seed();
    const seeded = await res.json();
    return Response.json({ ok: errors.length === 0, errors, ...seeded });
  } finally {
    running = false;
  }
}
