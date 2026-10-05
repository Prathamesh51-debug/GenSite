# GenSite

An AI website builder. Describe a business in one sentence and GenSite generates a complete,
responsive website you can watch being built, refine by chatting with it, roll back, and publish.

**[Live demo](https://ai-website-builder-prathamesh-three-amber.vercel.app)** &nbsp;·&nbsp;
[![CI](https://github.com/Prathamesh51-debug/GenSite/actions/workflows/ci.yml/badge.svg)](https://github.com/Prathamesh51-debug/GenSite/actions/workflows/ci.yml)

![GenSite landing page](assets/screenshots/landing.png)

## Features

- **Generate** a full single-page site from a prompt. Short prompts are first expanded into a design brief (brand, palette, fonts, sections).
- **Refine** by chat or by clicking any section. Chat edits tell you what they changed.
- **Version history** with one-click rollback, **publishing** to a public gallery, and HTML download.
- **Credits and billing** with Stripe Checkout; free and premium model tiers.

## Example output

Same prompt, free and premium tiers ([open free](https://raw.githack.com/Prathamesh51-debug/GenSite/main/assets/samples/free.html) · [open premium](https://raw.githack.com/Prathamesh51-debug/GenSite/main/assets/samples/premium.html)):

| Free tier | Premium tier |
| --- | --- |
| ![Free-tier output](assets/samples/free.png) | ![Premium-tier output](assets/samples/premium.png) |

## Architecture

```mermaid
flowchart LR
    browser["Browser<br/>React SPA · Vercel"]
    api["API<br/>Express · Render"]
    db[("PostgreSQL<br/>Supabase")]
    llm["OpenRouter<br/>free + premium models"]
    pexels["Pexels<br/>stock photos"]
    stripe["Stripe"]
    obs["Sentry · Langfuse"]

    browser -- "REST + SSE<br/>httpOnly session cookie" --> api
    browser -- "checkout" --> stripe
    stripe -- "signed webhooks" --> api
    api --> db
    api --> llm
    api --> pexels
    api --> obs
```

The server is organised by feature (`project`, `user`, `billing`), each split into routes,
controllers, services, a repository and request schemas. Controllers never touch the database;
pure logic (ledger, HTML handling, sanitizer, edit parsing) lives in `core/` and is unit-tested.

### How a generation works

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant A as API
    participant D as Postgres
    participant M as Model
    B->>A: POST /api/project/stream/:id (SSE)
    A->>D: take the project lease
    A->>D: charge credits, ledger row "pending"
    A->>M: expand a vague prompt into a brief
    A-->>B: progress events
    A->>M: generate the page
    A->>A: add photos, sanitize, tag sections
    A->>D: save version, mark charge "settled"
    A-->>B: done
    Note over A,D: Any failure refunds the charge and releases the lease
```

## Engineering

### Credits are charged exactly once

Every charge is a row in a ledger that moves from `pending` to exactly one final state.
The balance check and decrement are a single conditional `UPDATE`, and each transition only
applies while the row is still `pending`, so retries and races can't double-charge or double-refund.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> pending: charge if balance covers it
    pending --> settled: work saved
    pending --> refunded: failed, cancelled, or stuck over 20 min
    settled --> [*]
    refunded --> [*]
```

A background sweeper refunds charges left `pending` by a crash. Stripe fulfilment is idempotent
on the checkout session id, and refunds or lost disputes claw credits back once.

**Verified against a real Postgres in CI:** 100 concurrent 5-credit charges on a 25-credit balance
succeed exactly 5 times; racing refunds and settles resolve each charge once; the same Stripe event
delivered 5 times concurrently credits once.

### One writer per project

Generations, edits, saves and rollbacks take a lease on the project row (`lockToken` + expiry) with
one atomic `UPDATE`. Only the holder can release it, and a crashed holder's lease simply expires.
Ten concurrent attempts yield exactly one holder.

### Edits that stay edits

```mermaid
flowchart TD
    req["Chat edit request"] --> lease{"Project lease free?"}
    lease -- no --> busy["409: a change is in progress"]
    lease -- yes --> charge["Charge 5 credits (pending)"]
    charge --> model["Edit with the model<br/>for the site's tier"]
    model --> intent{"Labelled as a<br/>different website?"}
    intent -- yes --> refuse["Refund, nothing saved"]
    intent -- no --> drift{"Most text and the<br/>brand name replaced?"}
    drift -- yes --> refuse
    drift -- no --> save["Save version, list changes,<br/>settle charge"]
```

The model returns a short change summary alongside the page, which is shown in the chat and fed
back as context for later edits. Because the model's own label proved unreliable, a measured backstop
refuses edits that replace most of the text **and** the brand name — it separates translations from
rebuilds correctly on all 16 outputs in the eval set.

### Working with models

- One model call per site (plus one to expand vague prompts), under **$0.01 per free-tier site** (measured $0.001–0.005).
- Ordered fallback across models, one retry on rate limits, and cancellation that stops the call.
- Cut-off output (`finish_reason: length`) is detected: a cut-off edit is refunded and not saved, a cut-off generation is retried once, and failed work is refunded.
- An eval harness (`npm run eval`) runs real edit requests against sample sites and reports pass rate, latency and cost.

### Rendering untrusted HTML

Generated pages run in an `<iframe sandbox="allow-scripts">` with no `allow-same-origin`, so their
scripts can't reach the app's cookies or API. A sanitizer neutralises `javascript:` URLs and scripts
from unknown hosts as a second layer.

The API sets security headers, rejects cross-origin state-changing requests, rate-limits by route
class, and protects sign-up with a disposable-email block, a per-IP limit, an optional Turnstile
captcha, and a daily cap on free AI usage.

### Observability

Every request gets an id (returned as `X-Request-Id`) that tags each JSON log line through
`AsyncLocalStorage`. Unexpected errors go to Sentry. Each generation, chat edit and element edit is
one Langfuse trace with its model calls nested inside — tokens, cost, provider — and its outcome.

### Performance

The auth UI library and its dependencies were about 41% of the main bundle. Loading them only on the pages that use them:

| Landing page, logged out, Chrome "Slow 4G" | Before | After |
| --- | --- | --- |
| Main bundle | 835.6 KB (257.4 KB gzip) | **331.6 KB (108.6 KB gzip)** |
| JavaScript downloaded | 309 KB | **164 KB** |
| First contentful paint | 3.07 s | **2.22 s** |

## Testing

| Suite | Tests | Covers |
| --- | --- | --- |
| Unit | 114 | Ledger, locks, Stripe, model fallback and streaming, edit parsing, sanitizer, request context |
| Integration | 15 | Concurrency and full edit → save → rollback flows on a real Postgres |
| Model evals | 5 cases | Real model output: intent, change count, text drift, latency, cost |

Unit and integration tests run on every push; integration tests use a temporary Postgres service.
Evals call paid models and are run by hand.

```bash
cd server
npm test
npm run eval -- --tier free --runs 1

# integration tests need a local Postgres; they refuse to run against any other host
docker run -d --name gensite-test-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gensite_test -p 54329:5432 postgres:16-alpine
INTEGRATION_DATABASE_URL=postgresql://postgres:postgres@localhost:54329/gensite_test npm run test:integration
```

## Project structure

```
client/src/
├── app/          App shell and routing
├── pages/        Route screens (marketing, app, legal)
├── features/     auth · editor · billing
└── shared/       UI components, API clients, utilities

server/src/
├── app.ts        Middleware, routes, error handling
├── project/      Generation (SSE), edits, saves, rollback, project lease
├── user/         Projects, publishing, credits, plan and tier catalogs
├── billing/      Stripe checkout and webhooks
├── generation/   Prompts, model client, images
├── core/         Credit ledger, HTML, sanitizer, edit parsing (pure, unit-tested)
├── platform/     Auth, Prisma, email, logging, observability
└── shared/       Errors, validation, middleware, constants

server/tests/integration/   Real-Postgres tests
server/evals/               Model eval cases and runner
```

## Running locally

Requires Node.js 20+, a PostgreSQL database and an [OpenRouter](https://openrouter.ai) key.
Pexels and Stripe keys are optional.

```bash
git clone https://github.com/Prathamesh51-debug/GenSite.git
cd GenSite

cd server
npm install
cp .env.example .env          # fill in the values below
npx prisma migrate deploy
npm run dev                   # http://localhost:3000

cd ../client
npm install
cp .env.example .env          # set VITE_BASEURL
npm run dev                   # http://localhost:5173
```

## Configuration

**Server** (`server/.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection used at runtime |
| `DIRECT_URL` | Direct connection used only for migrations |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Session signing secret and the API's public URL |
| `TRUSTED_ORIGINS` | Comma-separated frontend origins (CORS and the cross-origin check) |
| `AI_API_KEY` | OpenRouter key |
| `GEN_MODELS`, `GEN_MODEL`, `PREMIUM_MODEL`, `EDIT_MODEL`, `ENHANCE_MODEL` | Optional model overrides |
| `PEXELS_API_KEY` | Optional; without it images use stable placeholder photos |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional; enables and enforces email verification |
| `SENTRY_DSN` | Optional error reporting |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASEURL` | Optional model tracing |
| `TURNSTILE_SECRET_KEY` | Optional sign-up captcha (set together with `VITE_TURNSTILE_SITE_KEY`) |
| `FREE_DAILY_AI_CAP` | Daily AI actions allowed for never-paid accounts (default 300, `0` disables) |
| `BLOCKED_EMAIL_DOMAINS` | Extra sign-up domains to block |
| `STREAM_PREVIEW` | Experimental: `true` streams free-tier generations into the preview (off by default) |
| `INTEGRATION_DATABASE_URL` | Tests only: a local Postgres for the integration suite |

**Client** (`client/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_BASEURL` | API base URL, baked in at build time |
| `VITE_TURNSTILE_SITE_KEY` | Optional sign-up captcha |

## Credits and plans

New accounts get 25 credits. A free-tier generation costs 5, premium 20, a chat edit 5 and an
element edit 2. Failed work is refunded, and a premium request served by a fallback model refunds
the premium surcharge.

| Plan | Price | Credits |
| --- | --- | --- |
| Basic | $5 | 100 |
| Pro | $19 | 400 |
| Enterprise | $49 | 1000 |

## Deployment

| Part | Platform | Notes |
| --- | --- | --- |
| Client | Vercel | Root `client`; `vercel.json` handles SPA routing |
| API | Render | Build `npm run build`, start `npm start` |
| Database | Supabase | Pooled URL at runtime; run `prisma migrate deploy` against `DIRECT_URL` |

Migrations are applied manually before deploying code that depends on them, never at startup.
The Stripe webhook listens for `checkout.session.completed`, `payment_intent.succeeded`,
`charge.refunded` and `charge.dispute.funds_withdrawn`. An external monitor pings `/healthz`,
which also checks database connectivity.

## Known limitations

- The live preview while generating is experimental and off by default; the current version reloads the frame for each update instead of appending to it.
- Generation time depends on which provider OpenRouter routes to and varies from under a minute to several minutes.
- No browser end-to-end or client component tests yet.
- The owner's editor preview needs `allow-same-origin` to read the page back; public views don't.
- Rate limits are in memory, which is fine for a single instance.

## License

[MIT](LICENSE)
