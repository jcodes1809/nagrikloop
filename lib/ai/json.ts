// Models sometimes wrap JSON in ```json fences or add chatter. Pull out the object.
export function extractJson(text: string): any {
  let t = (text ?? "").trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a === -1 || b === -1 || b < a) throw new Error("No JSON object in model output");
  return JSON.parse(t.slice(a, b + 1));
}
