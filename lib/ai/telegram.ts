// Server-side helper: send a Telegram message (optionally with buttons) to a citizen.
// Used by /api/ai/notify so Member 3's backend can ping the citizen (e.g. "approve this escalation letter").
import { HttpError } from "./errors";
import { cfg } from "./config";

export const ACTIONS = ["approve_letter", "skip_letter", "accept_closure", "reject_closure"] as const;
export type Action = (typeof ACTIONS)[number];
export type ButtonIn = { text: string; action: Action; complaint_id: string };

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

// callback_data is limited to 64 bytes by Telegram: "a|<action>|<id>"
export function buildKeyboard(buttons: ButtonIn[] | undefined) {
  if (!buttons || !buttons.length) return undefined;
  if (buttons.length > 6) throw new HttpError(400, "At most 6 buttons");
  const row = buttons.map((b) => {
    if (!b || typeof b.text !== "string" || !b.text.trim()) throw new HttpError(400, "Each button needs text");
    if (!ACTIONS.includes(b.action)) throw new HttpError(400, `button action must be one of: ${ACTIONS.join(", ")}`);
    const id = String(b.complaint_id ?? "");
    if (!ID_RE.test(id)) throw new HttpError(400, "button complaint_id may only contain letters, numbers, - and _ (max 40)");
    return { text: b.text.trim().slice(0, 40), callback_data: `a|${b.action}|${id}` };
  });
  return { inline_keyboard: [row] };
}

export async function sendTelegram(chatId: string | number, text: string, buttons?: ButtonIn[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token || token.startsWith("PASTE_")) throw new HttpError(503, "TELEGRAM_BOT_TOKEN not set");
  if (typeof text !== "string" || !text.trim()) throw new HttpError(400, "text required");
  if (!/^-?\d{1,20}$/.test(String(chatId))) throw new HttpError(400, "chat_id must be a number");
  const body: any = { chat_id: String(chatId), text: text.slice(0, 3500) };
  const kb = buildKeyboard(buttons);
  if (kb) body.reply_markup = kb;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), cfg().timeoutMs);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    const j: any = await res.json().catch(() => ({}));
    if (!j.ok) throw new HttpError(502, `Telegram refused: ${String(j.description ?? res.status).slice(0, 120)}`);
    return { ok: true, message_id: j.result?.message_id ?? null };
  } catch (e: any) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(502, "Could not reach Telegram");
  } finally {
    clearTimeout(t);
  }
}
