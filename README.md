# NagrikLoop

NagrikLoop closes the loop on civic complaints. A citizen files a complaint (for example garbage near a school), the system files it on a mock municipal portal, tracks the deadline, escalates automatically when the deadline is missed, and asks the citizen to confirm before a complaint is ever treated as closed. If an officer marks it resolved but the after-photo shows it is not fixed, the citizen can reject the closure and the system drafts a "false closure" letter.

- **Live site:** https://nagrikloop.vercel.app
- **Repo:** https://github.com/jcodes1809/nagrikloop
- **Stack:** Next.js 16 (App Router, TypeScript), Supabase (Postgres, Storage, pg_cron, pg_net), Vercel, Gemini and Groq for the AI parts

## How a complaint moves

```
SUBMITTED -> ACKNOWLEDGED -> IN_PROGRESS
          -> SLA_BREACHED -> ESCALATED (letter drafted)
          -> RESOLVED_PENDING_VERIFICATION (officer resolves, AI checks the after-photo)
          -> CLOSED (citizen accepts)  or  REOPENED -> ESCALATED (citizen rejects, false-closure letter)
```

`lib/status.ts` enforces which transitions are allowed and logs every change in `status_events`.

The SLA deadline is 72 hours. The **Time Machine** adds hours to the demo clock so a judge can see an SLA breach without waiting days.

## Setup

```bash
git clone https://github.com/jcodes1809/nagrikloop.git
cd nagrikloop
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

Open http://localhost:3000. Run `npm run build` before pushing.

### Environment variables (names only)

Never commit `.env.local`. In Vercel, set the same names under Project Settings, Environment Variables, then **redeploy** (changes only apply after a redeploy).

| Name | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (must be type Config in Vercel) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database access |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `RESEND_API_KEY` | Email sending |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Gemini AI |
| `GROQ_API_KEY`, `GROQ_TEXT_MODEL`, `GROQ_VISION_MODEL`, `GROQ_WHISPER_MODEL` | Groq AI |
| `AI_TIMEOUT_MS`, `FORCE_CACHE` | AI timeout and cached demo answers |
| `AI_ROUTE_SECRET` | Protects the AI routes |
| `CRON_SECRET` | Protects `/api/track` |
| `ENFORCE_GUARD` | Turns the route guard on (`1`) |

Check the AI setup at `/api/ai/health` (every value should be `true`).

### Database

Tables: `complaints`, `status_events`, `portal_complaints`, `app_settings`, `escalations`, `verifications`, `wards`. Photos are stored in a **public** Supabase Storage bucket named `photos`.

### Cron

Supabase `pg_cron` and `pg_net` call the tracker every minute. Run this in the Supabase SQL editor (replace the placeholder with the real `CRON_SECRET`, and never paste the real value into git):

```sql
select cron.schedule(
  'nagrikloop-track',
  '* * * * *',
  $$ select net.http_get(
       url := 'https://nagrikloop.vercel.app/api/track?key=YOUR_CRON_SECRET',
       timeout_milliseconds := 30000
     ); $$
);
```

Check that it works (you want `200`):

```sql
select status_code, created from net._http_response
where created > now() - interval '90 seconds' order by created desc;
```

## API routes

Base URL: `https://nagrikloop.vercel.app/api`

| Route | Method | Purpose |
|---|---|---|
| `/complaints` | GET | All complaints with `events`, `escalations`, `verifications`, `portal` |
| `/complaints/confirm` | POST | Create a complaint (Telegram or web). Fields: `photo_url`, `lat`/`lng` (or `latitude`/`longitude`), `ward`, `category`, `severity`, `description`, `telegram_chat_id`. Returns `{ id, portal_id }` |
| `/file` | POST | Direct file route (same result) |
| `/upload` | POST | Multipart form, field `file`. Returns `{ url }`. Keep files under about 4 MB |
| `/track` | GET | Cron tracker. Needs `?key=<CRON_SECRET>` or `Authorization: Bearer` |
| `/portal` | GET / POST | Mock portal list, and officer actions |
| `/portal/resolve` | POST | `{ complaint_id, after_photo_url, demo_key?, verdict? }` resolves and runs the AI check |
| `/verify` | POST | `{ complaint_id, demo_key?, verdict? }` before/after photo check |
| `/verify/decide` | POST | `{ complaint_id, decision: "accept" or "reject", language? }` |
| `/escalations/[id]/approve` | POST | Approve a letter for the Outbox |
| `/time` | GET / POST | Time Machine. POST `{ hours }` |
| `/reset` | POST | Wipe data, reset the clock, re-seed |
| `/seed` | GET | Load 3 seed complaints |
| `/ai/analyze`, `/ai/letter`, `/ai/verify`, `/ai/health` | various | AI routes |

Verdict values are `fixed`, `not_fixed`, `unclear`. Confidence is 0 to 100.

The mock officer portal is at `/portal`.

## Demo script

```bash
# 1. Clean state
curl -X POST https://nagrikloop.vercel.app/api/reset

# 2. File a complaint
curl -X POST https://nagrikloop.vercel.app/api/complaints/confirm \
  -H "Content-Type: application/json" \
  -d '{"ward":"LB Nagar","category":"garbage","severity":"high","description":"Garbage near school gate","lat":17.3457,"lng":78.5522}'

# 3. Jump the clock 4 days (deadline is 72 h), then wait about a minute for the cron
curl -X POST https://nagrikloop.vercel.app/api/time -H "Content-Type: application/json" -d '{"hours":96}'

# 4. Officer resolves (manual verdict if there are no real photos)
curl -X POST https://nagrikloop.vercel.app/api/portal/resolve -H "Content-Type: application/json" \
  -d '{"complaint_id":"<ID>","after_photo_url":"https://example.com/after.jpg","verdict":"not_fixed"}'

# 5. Citizen rejects the closure
curl -X POST https://nagrikloop.vercel.app/api/verify/decide -H "Content-Type: application/json" \
  -d '{"complaint_id":"<ID>","decision":"reject"}'
```

A +7 day jump creates letters for levels 1, 2 and 3 at once. Use +4 days to show only the first letter. Press Reset before every demo.

## Known limits

- `/api/reset`, `/api/seed` and `/api/time` are not guarded, so anyone with the link can wipe demo data. Do not share the link before judging.
- Vercel limits request size, so keep photos under about 4 MB.
- If an AI call times out, letters fall back to a plain template.

## Team

- **Member 1:** AI routes, prompts, Telegram bot
- **Member 2:** Web screens
- **Member 3:** Backend, database, tracking and escalation, deployment, delivery
