# ReachInbox Email Job Scheduler

A production-style email scheduler: schedule cold-email campaigns for a specific
time, send them reliably at scale via BullMQ + Ethereal SMTP, survive server
restarts without losing or duplicating jobs, enforce per-sender throughput
limits, notify Slack live when a limit is hit, and browse/search everything
from a dashboard.

## Monorepo layout

```
backend/     Express + TypeScript API, BullMQ worker, Prisma/Postgres, Redis, Elasticsearch
frontend/    Next.js + TypeScript + Tailwind dashboard
docker-compose.yml   Postgres, Redis, Elasticsearch for local dev
```

## Quick start

### 1. Infra (Postgres, Redis, Elasticsearch)

```bash
docker compose up -d
```

(If you don't have Docker, install Postgres 14+, Redis 6+, and Elasticsearch 8
locally and point the env vars below at them — this is exactly what was used
to verify the app during development on this machine.)

### 2. Backend

```bash
cd backend
cp .env.example .env      # fill in GOOGLE_* / SLACK_* once you have credentials
npm install
npx prisma migrate dev    # creates tables in Postgres
npm run dev                # API on :4000
npm run worker             # in a second terminal: the BullMQ worker
```

- API: http://localhost:4000
- Live BullMQ dashboard: http://localhost:4000/admin/queues

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

### 4. Ethereal Email (fake SMTP)

No setup needed — the app calls `nodemailer.createTestAccount()` itself
whenever you click **"+ New sender"** in the compose modal (or `POST
/api/senders`). Each sender gets its own throwaway Ethereal inbox. After a
send, the worker logs a preview URL like
`https://ethereal.email/message/...` — open it to see the actual email.

### 5. Google OAuth (login)

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth
   client ID** (Web application).
2. Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
3. Put the client ID/secret into `backend/.env` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`. Restart the API — no code changes needed.
4. Without these set, `/api/auth/google` returns a 503 instead of crashing;
   the rest of the app (senders, scheduling, Slack) still works if you mint a
   session token another way (see "Testing without OAuth" below).

### 6. Slack OAuth (rate-limit notifications)

1. Create a Slack app at api.slack.com/apps → **OAuth & Permissions** → add
   redirect URL `http://localhost:4000/api/slack/callback` → enable the
   **Incoming Webhooks** feature (scope `incoming-webhook`, plus `chat:write`).
2. Put the client ID/secret into `backend/.env` as `SLACK_CLIENT_ID` /
   `SLACK_CLIENT_SECRET`.
3. In the dashboard, click **"Connect Slack"** → authorize → you're redirected
   back with a stored incoming-webhook URL. The very next time that user's
   sender hits its hourly limit, a real Slack message is posted — no redeploy
   needed. If Slack was never connected, the notification step is skipped
   silently (never crashes the send pipeline).

### Testing without OAuth credentials

Since Google/Slack credentials must be created by whoever owns the assignment
submission, the backend is fully usable without them: mint a session cookie
directly against a seeded user, e.g.

```bash
node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign({ userId: '<a User.id from your DB>' }, process.env.JWT_SECRET, { expiresIn: '7d' }));
"
```
and send it as the `ri_session` cookie. This is exactly how the scheduling,
rate-limiting, restart-persistence, and search flows below were verified.

## Architecture

### Scheduling — no cron, ever

Every scheduled email is a **BullMQ delayed job**
(`emailQueue.add('send-email', payload, { jobId, delay })`), added the moment
`POST /api/emails/schedule` runs. `delay` is computed once from
`scheduledAt - now`. There is no polling loop, no `setInterval`, no
`node-cron` anywhere in this codebase — BullMQ's own delayed-job scheduler
(backed by a Redis sorted set) is what fires the job at the right time.

### Persistence across restarts

Two independent layers guarantee "future emails still send correctly after a
restart, and are never restarted from scratch":

1. **Redis persistence.** Delayed jobs live in Redis (AOF enabled in
   `docker-compose.yml`), so a normal API/worker restart changes nothing —
   the job is still sitting in Redis's delayed set and fires on schedule.
   Verified: killed the worker mid-delay, restarted it, the job still sent at
   its original scheduled time.
2. **Boot-time reconciliation (not a cron).** On process start, the API calls
   `reconcileScheduledEmails()` (`backend/src/services/reconcile.ts`), which
   queries Postgres for every `EmailJob` still `status = 'scheduled'` and
   re-adds it to the queue with the same **deterministic job id**
   (`email-<EmailJob.id>`). If BullMQ already has that job, this is a no-op.
   If Redis was wiped entirely, this recreates every pending job from the
   source of truth (Postgres) exactly once, at exactly its original
   `scheduledAt`. Verified: scheduled an email, killed both processes, ran
   `redis-cli flushall` to simulate a fully lost queue, restarted the API
   (log: `Reconciling 1 scheduled email job(s) with the queue...`), started
   the worker, and the email sent at the correct time.

### Idempotency (no double-sends)

- The BullMQ `jobId` is deterministic (`email-<EmailJob.id>`), so re-enqueuing
  the same row (reconciliation, a retry, a duplicate API call) is a no-op at
  the queue level.
- Before sending, the worker checks the DB row: if it's already `sent`, it
  returns immediately without calling SMTP again.
- Claiming a row for processing uses a conditional update
  (`UPDATE ... WHERE id = ? AND status IN ('scheduled','processing')`), so two
  concurrent workers can never both send the same email — only one update
  succeeds.

### Concurrency, per-send delay, and hourly rate limiting

All three are configurable via env (`backend/.env`), never hardcoded, and all
rate-limit state lives in **Redis**, so it stays correct across multiple
worker processes / concurrency > 1.

- **Concurrency**: `WORKER_CONCURRENCY` (default 5) passed straight to
  BullMQ's `Worker({ concurrency })`.
- **Minimum delay between sends** (per sender): `MIN_DELAY_MS_BETWEEN_SENDS`
  (default 2000ms). Enforced with an atomic `SET lastSent:<senderId> <now> NX
  PX <minDelayMs>` — the reservation itself *is* the check, so under
  concurrency > 1 only one of several simultaneously-processed jobs for the
  same sender can win the slot (a plain GET-then-SET would let two concurrent
  workers both pass the check before either wrote the new timestamp). A
  campaign's "Delay between emails" field in the compose UI overrides this
  per-sender (see `Sender.minDelayMsOverride`).
- **Emails/hour** (per sender): `MAX_EMAILS_PER_HOUR_PER_SENDER` (default
  200). Enforced with an atomic `INCR` + `EXPIRE` on
  `rate:<senderId>:<hourBucket>`. A campaign's "Hourly limit" field overrides
  this per-sender (`Sender.hourlyLimitOverride`).
- **On limit hit**: the job is **not failed or dropped** — BullMQ's
  `job.moveToDelayed(nextHourStart, token)` reschedules it to the start of the
  next hour bucket, preserving order as closely as BullMQ's delayed sorted-set
  allows. Verified twice: (1) scheduled 5 emails with `hourlyLimit: 2` — 2 sent
  immediately, the remaining 3 pushed to the next hour boundary; (2) scheduled
  10 emails with `delayMs: 0` and `hourlyLimit: 3` (all 10 fire at once under
  `WORKER_CONCURRENCY=5`) — exactly 3 sent, exactly 7 deferred, confirming the
  atomic reservation holds under real concurrent contention, not just
  sequential load.
- **1000+ emails at once**: the schedule endpoint generates ids client-side
  and bulk-inserts all `EmailJob` rows with a single `createMany` (not N
  sequential creates inside one interactive transaction, which can hit
  Prisma's default 5s transaction timeout well before 1000 rows), then
  bulk-enqueues via BullMQ's `addBulk` and bulk-indexes via the ES `_bulk`
  API — one round trip per store instead of N. Verified by scheduling 1200
  and 5000-recipient batches (the latter's JSON body exceeds Express's
  default 100kb limit, which is why `express.json({ limit: "10mb" })` is set
  explicitly) — both returned `201` in well under a second. Concurrency and the
  hourly cap then naturally throttle how fast the worker actually drains the
  queue — no special-casing needed for large batches.

### Search (Elasticsearch)

Every `EmailJob` is upserted into the `emails` index on creation and on every
status transition (`scheduled → processing → sent/failed`), via
`indexEmailDoc()`. `GET /api/emails/search?q=` runs a `multi_match` over
subject/body/recipient. If Elasticsearch is unreachable, indexing/search calls
log an error and degrade gracefully instead of taking down the API or worker
— verified by running the full send pipeline with no Elasticsearch instance
running at all.

### Live BullMQ dashboard

Mounted at `/admin/queues` via `@bull-board/express`, wired to the same
`Queue` instance the API uses — shows delayed/active/completed/failed jobs in
real time.

### Auth

- **Google OAuth** (`passport-google-oauth20`) issues an httpOnly JWT cookie
  on successful login; no server-side session store.
- **Slack OAuth v2** stores an incoming-webhook URL per user (tenant) in
  Postgres. State is threaded through as a short-lived signed JWT since
  Slack's redirect doesn't carry our cookie.

### Reliability: one failing request can't take down the API

Express 4 does not route a rejected promise from an `async` route handler to
error middleware — it becomes an unhandled rejection, and Node terminates the
process on those by default (since Node 15). Every async route is wrapped in
`asyncHandler` (`backend/src/middleware/asyncHandler.ts`), and a catch-all
error middleware in `index.ts` turns any failure into a clean `500` instead.
Verified by stopping Postgres mid-request: the in-flight request returned
`500` (not a hang), `/health` kept responding throughout, and normal requests
worked again the moment Postgres came back — no restart needed.

## Features implemented

**Backend**
- [x] Schedule endpoint, stored in Postgres, scheduled via BullMQ delayed jobs (no cron)
- [x] Ethereal SMTP sending, one throwaway account per sender
- [x] Elasticsearch indexing + search endpoint
- [x] Live BullMQ dashboard (`/admin/queues`)
- [x] Restart persistence (Redis + boot-time reconciliation), verified end-to-end
- [x] Idempotent sends (deterministic job id + conditional DB claim)
- [x] Configurable worker concurrency
- [x] Configurable min delay between sends (global default + per-campaign override)
- [x] Configurable emails/hour per sender (global default + per-campaign override), Redis-backed, safe under concurrency
- [x] Over-limit jobs rescheduled into next hour window, never dropped/failed
- [x] Real Slack OAuth + live webhook notification on rate-limit hit, no-op if not connected, works without redeploy once connected

**Frontend**
- [x] Real Google OAuth login → redirect to dashboard
- [x] Header with name/email/avatar + logout
- [x] Scheduled / Sent tabs, Compose New Email button
- [x] Compose modal: subject, body, CSV/TXT lead upload with detected-count display, start time, delay, hourly limit
- [x] Scheduled table: email, subject, scheduled time, status, loading + empty states
- [x] Sent table: email, subject, sent time, status, loading + empty states
- [x] Connect Slack button in header, live connect/disconnect state
- [x] Toast-based error handling, reusable UI components (Button, Input, Modal, Table, EmptyState, Toast)

## Assumptions, shortcuts, and trade-offs

- No Figma file was actually attached to the assignment text handed to me —
  the UI was built directly from the written spec (header, tabs, compose
  modal, tables, empty/loading states) rather than a pixel-accurate Figma
  match.
- "Tenant" = the logged-in Google user. Slack integration and rate-limit
  overrides are scoped per sender/per user, not a separate multi-tenant org
  model.
- The compose form's "Hourly limit" and "Delay between emails" fields are
  applied as an override on the chosen `Sender` (last campaign scheduled for
  that sender wins), rather than being scoped to a single campaign batch —
  simpler to reason about for a sender that's mid-flight, at the cost of two
  concurrent campaigns on the same sender not being able to run under
  different limits simultaneously.
- Elasticsearch runs single-node with security disabled — fine for local dev,
  not how you'd run it in production.
- Ethereal accounts are created on demand and stored in plaintext in Postgres
  (they're throwaway test credentials by design, so this is fine for this
  assignment; a real SMTP credential store would need encryption at rest).
- `next@14.2.35` (latest 14.x patch) is used instead of jumping to Next 16 to
  avoid an unnecessary breaking-change risk this close to a deadline; a few
  Next.js advisories that mostly target self-hosted production deployments
  (image optimizer, server actions, edge middleware) are not addressed by
  staying on 14.x. Not a concern for local/demo use.
- CSV/lead-list parsing is a permissive regex email-extraction (works for
  CSV, plain text, or a list with extra columns) rather than a strict
  column-mapped CSV parser.

## Verification performed during development

All of the following were run for real, against a locally installed Postgres
+ Redis (Docker wasn't available in the dev sandbox, so native installs were
used — `docker-compose.yml` is provided and equivalent for anyone with
Docker):

1. Backend and frontend both typecheck (`tsc --noEmit`) and build
   (`next build`, `tsc -p tsconfig.json`) cleanly.
2. Created a real Ethereal sender via the API.
3. Scheduled an email 5s out — worker sent it and logged a working
   `ethereal.email` preview URL.
4. Killed the worker mid-delay and restarted it — the job still fired at its
   original scheduled time.
5. Scheduled an email, killed both processes, `redis-cli flushall` (simulating
   total queue loss), restarted the API (logged the reconciliation), started
   the worker — the job still fired at the correct time, exactly once.
6. Scheduled 5 emails on one sender with `hourlyLimit: 2` — 2 sent
   immediately, the other 3 were moved to the next hour boundary in BullMQ's
   delayed set (confirmed by decoding the Redis sorted-set score) instead of
   failing.
7. Ran the API and worker with no Elasticsearch instance available — both
   started and served normally, with indexing/search failures logged and
   degraded rather than crashing the process.
8. A second, deeper audit pass against this checklist caught and fixed three
   real issues, each re-verified live:
   - Async route handlers weren't wrapped, so Express 4 + Node's
     fatal-unhandled-rejection default meant any DB hiccup would crash the
     whole process. Fixed with `asyncHandler` + a global error middleware;
     confirmed by stopping Postgres mid-request (clean `500`, no crash) and
     resuming normally once it came back.
   - The min-delay-between-sends check was a plain Redis GET-then-SET, not
     atomic — under `WORKER_CONCURRENCY > 1` two jobs for the same sender
     could both pass the check before either recorded a timestamp. Fixed with
     an atomic `SET NX PX` reservation; confirmed by scheduling 10 emails at
     once (`delayMs: 0`, `hourlyLimit: 3`) and seeing exactly 3 sent, exactly
     7 deferred — no over-count.
   - Bulk scheduling used `$transaction([...N creates])` and a sequential
     per-job enqueue loop, which risks Prisma's transaction timeout and is
     slow at real scale; the default `express.json()` 100kb body limit would
     also reject a large recipient list outright. Fixed with `createMany` +
     `addBulk` + a bulk ES index call, and a 10mb JSON limit; confirmed by
     scheduling 1200- and 5000-recipient batches (the larger one is 119kb,
     over the old default limit) in well under a second each.

## Demo video checklist

- [ ] Schedule a few emails from the frontend (and/or Postman)
- [ ] Show the dashboard's Scheduled and Sent tabs updating
- [ ] Stop the worker → restart it → show a delayed email still sending at
      the right time
- [ ] (Bonus) Schedule a burst that exceeds the hourly limit and show the
      excess jobs land in the next hour window in `/admin/queues`
