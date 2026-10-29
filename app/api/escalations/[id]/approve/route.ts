import { db } from "@/lib/supabase";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { data, error } = await db
    .from("escalations")
    .update({ approved: true, sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, escalation: data });
}
