import { HttpError } from "./errors";

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Body must be valid JSON");
  }
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e: any) {
    if (e instanceof HttpError) return json({ error: e.message, ...(e.extra ?? {}) }, e.status);
    console.error("Unhandled error:", e?.message ?? e);
    return json({ error: "Internal error" }, 500);
  }
}
