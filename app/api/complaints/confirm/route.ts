import { POST as fileComplaint } from "@/app/api/file/route";

// Telegram bot / web app confirm step. Maps bot fields onto the file route.
export async function POST(req: Request) {
  const b = await req.json();
  const mapped = {
    photo_url: b.photo_url,
    lat: b.lat ?? b.latitude,
    lng: b.lng ?? b.longitude,
    ward: b.ward,
    category: b.category,
    severity: b.severity,
    description: b.description,
    telegram_chat_id: b.telegram_chat_id ?? b.chat_id ?? null,
  };
  return fileComplaint(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapped),
    })
  );
}
