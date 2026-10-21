# EventPulse Analytics

An end-to-end event analytics platform: a browser SDK and a Node server SDK
send events to a NestJS ingestion API backed by SQLite, and a Next.js
dashboard visualizes the results. A small restaurant demo app (also Next.js)
is instrumented with both SDKs to show the whole pipeline working together —
from a page view and an "Add to cart" click, through to a server-side
`order_created` event when checkout completes.

## Contents

- [Architecture](#architecture)
- [Repo layout](#repo-layout)
- [Local setup](#local-setup)
- [SDK integration](#sdk-integration)
- [API reference](#api-reference)
- [Data model & identity](#data-model--identity)
- [Key decisions](#key-decisions)
- [Tradeoffs & known limitations](#tradeoffs--known-limitations)
- [Testing](#testing)

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   Next.js demo app      │        │   Next.js dashboard       │
│   (/, /menu, /checkout) │        │   (/dashboard)             │
│                          │        │                            │
│  @eventpulse/browser-sdk │        │  server-side fetch with    │
│  tracks pageviews +      │        │  the DASHBOARD api key     │
│  custom events           │        │  (never sent to browser)   │
└───────────┬──────────────┘        └─────────────┬──────────────┘
            │ POST /api/v1/events(/batch)          │ GET /api/v1/analytics/*
            │ X-API-Key: ingest key                │ X-API-Key: dashboard key
            ▼                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS backend (backend/)                    │
│   EventsController → EventsService → TypeORM → SQLite            │
│   AnalyticsController → AnalyticsService (date-range queries)    │
│   OrdersController → OrdersService ─────────────┐                │
└───────────────────────────────────────────────────┼──────────────┘
                                                      │ track('order_created')
                                                      ▼
                                   @eventpulse/server-sdk (Node)
                                   POSTs back to /api/v1/events
                                   with retry + fail-soft error handling
```

Three independent packages, one backend, one frontend:

| Path | What it is |
|---|---|
| `packages/browser-sdk` | Framework-agnostic TypeScript SDK for the browser. Builds to ESM, CJS, and an IIFE for `<script>` tag use. |
| `packages/server-sdk-node` | Minimal Node/TypeScript client for sending business events from any backend. Zero runtime dependencies (uses the native `fetch`). |
| `backend` | NestJS API: event ingestion, analytics queries, and a demo `orders` endpoint. SQLite via TypeORM. |
| `frontend` | Next.js App Router app: the restaurant demo (`/`, `/menu`, `/checkout`) and the analytics dashboard (`/dashboard`). |

## Repo layout

```
eventpulse-analytics/
├── backend/                  NestJS ingestion + analytics API
├── frontend/                 Next.js demo app + dashboard
├── packages/
│   ├── browser-sdk/          @eventpulse/browser-sdk
│   └── server-sdk-node/      @eventpulse/server-sdk
└── .claude/launch.json       dev-server shortcuts (optional, for Claude Code)
```

## Local setup

Prerequisites: **Node.js 18+** and npm. No Docker, no external database —
everything runs on SQLite files that are created automatically.

```bash
# 1. Build the packages the backend/frontend depend on
cd packages/server-sdk-node && npm install && npm run build && cd ../..
cd packages/browser-sdk && npm install && npm run build && cd ../..

# 2. Backend
cd backend
cp .env.example .env     # defaults work out of the box for local dev
npm install
npm run start:dev        # http://localhost:8000
```

In a second terminal:

```bash
# 3. Frontend
cd frontend
cp .env.example .env.local   # defaults point at the local backend
npm install
npm run dev               # http://localhost:3000
```

Open `http://localhost:3000` for the restaurant demo, click through
Home → Menu (add a couple of items) → Checkout → place the order, then open
`http://localhost:3000/dashboard` to see the pageviews, the order, and the
traffic trend show up.

The SQLite database file is created on first run at
`backend/database/eventpulse.sqlite` (schema is auto-synced by TypeORM — see
[Tradeoffs](#tradeoffs--known-limitations)).

## SDK integration

### Browser SDK (`@eventpulse/browser-sdk`)

```ts
import { EventPulse } from '@eventpulse/browser-sdk';

const eventpulse = new EventPulse({
  apiKey: process.env.NEXT_PUBLIC_EVENTPULSE_INGEST_API_KEY!,
  apiHost: process.env.NEXT_PUBLIC_EVENTPULSE_API_HOST!,
  autoTrackPageviews: true, // fires a pageview immediately; set false if you call page() manually (e.g. on SPA route changes)
});

eventpulse.page('/menu');                       // manual pageview (e.g. after a client-side route change)
eventpulse.track('add_to_cart', { itemId: 'margherita', price: 12.5 });
eventpulse.identify('user_42');                 // attach a known user id to future events
eventpulse.getIdentity();                       // { anonymousId, userId } — forward to your backend to attribute server-side events
```

Also usable with no build step at all via a `<script>` tag:

```html
<script src="/eventpulse/index.global.js"></script>
<script>
  const { EventPulse } = window.EventPulse;
  const eventpulse = new EventPulse({ apiKey: '...', apiHost: 'https://your-api.com' });
  eventpulse.track('signed_up');
</script>
```

See [`frontend/lib/eventpulse.ts`](frontend/lib/eventpulse.ts) and
[`frontend/components/EventPulseProvider.tsx`](frontend/components/EventPulseProvider.tsx)
for how this is wired into a real Next.js app (one singleton instance, a
pageview fired on every client-side route change).

### Server SDK (`@eventpulse/server-sdk`, Node)

```ts
import { EventPulseClient } from '@eventpulse/server-sdk';

const eventPulse = new EventPulseClient({
  baseUrl: 'http://localhost:8000',
  apiKey: process.env.EVENTPULSE_INGEST_API_KEY!,
  onError: (err) => logger.warn('EventPulse track failed', err), // never throws
});

await eventPulse.track('order_created', { orderId: 42, total: 19.5 }, { anonymousId: req.body.anonymousId });
await eventPulse.trackBatch([{ eventName: 'invoice_paid', properties: { amount: 99 } }]);
```

See [`backend/src/orders/orders.service.ts`](backend/src/orders/orders.service.ts)
for a real usage: creating a demo order fires `order_created` through this
client, independent of whatever the browser SDK already tracked for that
page view.

## API reference

All routes are prefixed with `/api`. Two separate API keys, sent via the
`X-API-Key` header:

| Key | Env var | Used by |
|---|---|---|
| **Ingest** (write) | `EVENTPULSE_INGEST_API_KEY` | Browser SDK, server SDK — posting events |
| **Dashboard** (read) | `EVENTPULSE_DASHBOARD_API_KEY` | Dashboard's server-side fetch — reading analytics |

| Method & path | Auth | Description |
|---|---|---|
| `POST /api/v1/events` | ingest | Ingest a single event |
| `POST /api/v1/events/batch` | ingest | Ingest up to `EVENTPULSE_MAX_BATCH_SIZE` events; each item is validated independently — one bad item doesn't reject the batch |
| `GET /api/v1/analytics/summary?from&to` | dashboard | Total events, pageviews, unique visitors, orders |
| `GET /api/v1/analytics/popular-pages?from&to&limit` | dashboard | Top URLs by pageview count |
| `GET /api/v1/analytics/trends?from&to&interval=day\|hour` | dashboard | Time series for the traffic chart |
| `GET /api/v1/analytics/events?from&to&eventName&page` | dashboard | Paginated raw event explorer |
| `POST /api/v1/orders` | none (public demo endpoint) | Creates a demo order, fires `order_created` server-side |

`from`/`to` default to the last 7 days when omitted.

## Data model & identity

Single `events` table (see [`backend/src/events/event.entity.ts`](backend/src/events/event.entity.ts)):

| Field | Notes |
|---|---|
| `event_name` | e.g. `page_view`, `add_to_cart`, `order_created` |
| `event_type` | `pageview` \| `custom` \| `server` |
| `source` | `browser` \| `server` |
| `anonymous_id` | Always present — see identity model below |
| `user_id` | Nullable |
| `url`, `referrer` | Pageview context |
| `properties` | Arbitrary JSON payload |
| `ip_hash` | SHA-256 hash, salted — raw IPs are never stored |
| `occurred_at` / `received_at` | Client-reported time vs. server receipt time |

**Identity model:**
- `anonymousId` — generated once per browser (`crypto.randomUUID()`), persisted in `localStorage`. This is the primary join key for "unique visitors."
- `userId` — optional, set via `identify()`. Persisted in `localStorage` so once a visitor is known, later pageviews stay attributed without calling `identify()` again. **No anonymous→user alias merging is implemented** — events recorded before `identify()` is called keep their original `anonymousId` only (see Limitations).
- Server-originated events (e.g. `order_created`) forward the browser's `anonymousId` when the caller has it (the checkout form does this), so an order can be joined back to the visitor who placed it. Server calls with no browser context get a synthetic `server-<random>` id and simply won't show up as a "visitor."
- No per-visit (session) grouping is implemented — only a lifetime `anonymousId` and an optional `userId`. A session concept (grouping events by visit, with an idle timeout) would be a natural next addition but isn't needed for the metrics this assignment asks for (traffic, unique visitors, popular pages, trends), so it was left out rather than built and left unused.

## Key decisions

- **Two API keys, not one.** A leaked ingest (write) key can't be used to read analytics, and a leaked dashboard (read) key can't be used to write fake events.
- **The ingest key is intentionally not treated as a secret.** It ships in client-side JS, same as a Segment `writeKey` or a GA measurement ID — it's write-only and meant to be rate-limited, not confidential. The dashboard key is a real secret and is only ever used server-side (Next.js server component), never sent to the browser.
- **Batch ingestion validates each item independently.** One malformed event in a batch of 20 doesn't lose the other 19 — the SDK's queue only drops events the API actually rejected.
- **The server SDK fails soft.** `track()`/`trackBatch()` never throw; a flaky analytics endpoint can't break a checkout flow. It does retry on network errors/5xx (with backoff), but not on 4xx (retrying a validation error wastes attempts for nothing).
- **`unique_visitors` is scoped to pageview events only.** Including `server`-sourced events in that count would conflate real browsing visitors with synthetic server-side ids.
- **sendBeacon can't set custom headers**, so the browser SDK's unload-time flush sends the ingest key as a query param instead of a header. The backend's auth guard accepts either. This is fine precisely because the ingest key isn't a secret (see above) — this would **not** be an acceptable pattern for the dashboard key.
- **SQLite + `synchronize: true`** for zero-setup local development — no separate DB server, no migration step before first run.

## Tradeoffs & known limitations

- **No real auth or multi-tenancy.** One pair of static API keys for the whole deployment. A production system would issue per-customer keys stored hashed in a database, not read from a single `.env` value.
- **No anonymous→user identity merging.** `identify()` tags future events with a `userId`; past anonymous events for that visitor are not retroactively re-attributed.
- **Schema via `synchronize: true`, not migrations.** Fine for a take-home demo; a real project would use TypeORM migrations so schema changes are reviewable and reversible.
- **Browser SDK retry strategy is "the next periodic flush tick"**, not exponential backoff — simpler, and in practice just as effective for a tab that stays open, but a page that unloads mid-outage can still lose events beyond what `sendBeacon` manages to send.
- **No bot/spider filtering** on ingestion — a scripted client can inflate pageview/visitor counts. A production system would add basic user-agent heuristics or a challenge.
- **Order creation calls the event tracker synchronously (in-request)**, not via a background job/queue. The call has a short timeout and fails soft, so it doesn't block checkout for long, but a queue (e.g. a Redis-backed job) would be more resilient under load.
- **No data retention/export tooling.** Events accumulate indefinitely; there's no purge job or archival path.
- **Dashboard date grouping (`trends`) uses SQLite's `strftime`** directly in the query — switching databases (e.g. to Postgres) would need that one query rewritten.
- **No automated browser (Playwright/Cypress) tests.** Verification for the demo app and dashboard was manual click-through plus curl-driven checks of the rendered HTML; only the SDKs and backend API have automated test suites (see below).

## Testing

```bash
# Backend: e2e/integration tests (ingestion validation/auth, batch partial-failure, analytics correctness, order flow)
cd backend
npm test

# Browser SDK: identity persistence, queue durability, flush/retry/beacon behavior
cd packages/browser-sdk
npm test

# Server SDK: payload shape, retry-then-succeed, fail-soft after exhausting retries, no retry on 4xx
cd packages/server-sdk-node
npm test
```
