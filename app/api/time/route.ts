import { db } from "@/lib/supabase";
import { getOffsetHours } from "@/lib/clock";

export async function POST(req: Request) {
  const { hours } = await req.json();
  const offset = (await getOffsetHours()) + Number(hours);
  await db.from("app_settings").update({ value: String(offset) }).eq("key", "time_offset_hours");
  return Response.json({ offset });
}

export async function GET() {
  return Response.json({ offset: await getOffsetHours() });
}
