# Scaling notes

Deliberately-deferred infrastructure, why it's deferred, and the exact path to turn
it on when metrics justify it. The app today targets a **single Render instance +
Supabase**; none of the below is needed at that scale, so building it now would be
premature. The seams are in place so each is an additive change, not a rewrite.

---

## 1. Generation jobs / SSE streaming

**Today:** `POST /api/project/stream/:id` runs the LLM generation in-process and
streams Server-Sent Events back over the request body. A process-local
`Set<projectId>` guard (`projectController.ts`) prevents a reconnect/duplicate from
starting a second generation for the same project.

**Limitation:** the stream lives in *one process's memory*. With 2+ instances, a
reconnect can land on an instance that never had the job, and the in-memory guard
doesn't span instances.

**When to upgrade:** when you run more than one API instance, or generation volume
makes a single event loop the bottleneck.

**Upgrade path (Redis + BullMQ):**
1. Provision Redis (Upstash / Render Key Value); set `REDIS_URL`.
2. `createUserProject` enqueues a `generate` job instead of the client calling the
   stream endpoint directly.
3. A worker process consumes the queue, runs the LLM call, and writes progress
   (chunks) to Redis pub/sub keyed by project id.
4. The stream endpoint becomes **read-only**: it subscribes to that project's
   channel and relays events — so any instance can serve any client's reconnect.
5. Replace the in-memory `Set` guard with the queue's job-dedup (jobId = projectId).

---

## 2. Generated-site HTML storage

**Today:** HTML lives inline in Postgres (`Version.code`, `WebsiteProject.current_code`).
All writes already flow through `lib/storage.ts` (`storeHtml`), which currently uses
the `inline` driver (reference == content), so behaviour is unchanged.

**Limitation:** large HTML bodies, duplicated per version, bloat the DB and hot rows.
(The worst symptom — shipping every version body on project load — is already fixed:
`getUserProject` returns version metadata only.)

**When to upgrade:** when DB size / row width becomes a cost or latency problem.

**Upgrade path (R2 / S3 / Supabase Storage):**
1. Implement the `s3Store` adapter in `lib/storage.ts` (`put` uploads and returns
   `s3://bucket/key`; `get` fetches it). Set `STORAGE_DRIVER=s3` + bucket/credentials.
2. Route the **read** paths through `loadHtml()` so old inline rows and new
   references both resolve (the four call sites are listed in `lib/storage.ts`).
3. No migration needed for existing rows — inline references still resolve.

---

## 3. Email verification

**Status: implemented** (not deferred). `lib/email.ts` sends via Resend when
`RESEND_API_KEY` is set, and logs to console otherwise. Verification is **enforced
only when a provider is configured** (`requireEmailVerification: isEmailConfigured()`),
so an unconfigured environment can't lock users out.

**To enable in production:** set `RESEND_API_KEY` and `EMAIL_FROM` (a verified
sender). Existing unverified accounts will be prompted to verify on next sign-in.

---

## 4. Generated-site runtime dependencies (CDN reliance)

**Today:** every generated site loads its toolchain from third-party CDNs at
runtime — the Tailwind browser build (`cdn.jsdelivr.net/npm/@tailwindcss/browser`),
AOS (`cdn.jsdelivr.net/npm/aos`), Google Fonts, and images hotlinked from
`picsum.photos` / `i.pravatar.cc` (see `lib/prompts.ts`). This is intentional: it
keeps generation to a single LLM call with **zero build step**, and the Tailwind
*browser* runtime compiles utility classes client-side, which the design pipeline
depends on.

**Limitation:** a published or **downloaded** site is not self-contained. If any
CDN is unreachable (outage, region block, ad-blocker, offline), the site renders
unstyled or without images — slightly at odds with the "production-ready, no
lock-in" pitch. Hotlinked placeholder images are also not guaranteed permanent.

**When to upgrade:** when users ship these sites as real production sites, or ZIP
export needs to work fully offline.

**Upgrade path (build-on-export):**
1. Add an export pipeline (server-side or a worker) that, for a download/publish,
   runs the Tailwind **CLI** against the generated HTML to emit a static
   `styles.css`, and self-hosts the fonts — replacing the browser-runtime `<script>`
   and Google Fonts `<link>` with local assets.
2. Optionally fetch-and-inline (or proxy) the placeholder images so the ZIP has no
   external calls.
3. Keep the CDN approach for the **live in-app preview** (no build step there); only
   the exported/published artifact gets the self-contained treatment.
