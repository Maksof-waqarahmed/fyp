# AI Agent Context — AI-Powered Uptime Monitor (FYP)

**Last Updated:** May 2026
**Tech Stack:** Next.js 16, React 19, Prisma 7, tRPC 11, OpenAI, PostgreSQL, Better Auth, Vitest

---

## 📋 Project Overview

AI-powered website uptime monitoring system that:
- Monitors websites for availability via cron-based DNS / SSL / HTTP / content-hash checks
- Detects performance degradation **statistically** (rolling baseline, no LLM)
- Generates human-readable down alerts via OpenAI (cached + rate-limited)
- Provides on-demand **AI Root Cause Analysis** with structured JSON output
- Sends predictive warnings (SSL expiry, unstable endpoints) before they become outages
- Tracks incidents in a dedicated table (no log-replay computation)
- Publishes status pages with 90-day uptime visualization

---

## 🗄️ Database Schema (Prisma)

### Models

| Model | Purpose | Notable fields |
|---|---|---|
| **User** | OAuth users (Google/GitHub) | `email`, `isActive` |
| **Session / Account / Verification** | Better Auth | — |
| **Project** | Monitoring projects | `userId`, `isDeleted` |
| **Endpoint** | URLs to monitor | `checkInterval` (minutes, ≥5), `consecutiveDownCount`, `nextCheckAt`, `lastStatus` |
| **Setting** | Per-user notification prefs | `email`, encrypted `slackWebhook`+`slackWebhookIv`+`slackWebhookAuthTag`, `aiCallsCount`, `aiCallsResetAt`, `isActive` |
| **Log** | Each check result | `status`, `httpCode`, `responseTime`, `dnsStatus`, `sslValid`, `sslExpiry`, `contentHash`, `isAnomaly` |
| **Notification** | Sent alerts ledger | `type` (EMAIL/SLACK), `kind` (DOWN/DEGRADED/SSL_WARNING/UNSTABLE), `status`, `metadata` |
| **Incident** | Grouped downtime episodes | `status` (ONGOING/RESOLVED), `startedAt`, `recoveredAt`, `downtimeMs`, `triggerStatus`, `triggerLogId`, `errorMessage`, `httpCode` |
| **StatusPage** | Public status page configs | `slug`, `title`, `projects` (M:N) |

### Enums

- `HTTPStatus`: UP, REDIRECT, CLIENT_ERROR, DOWN, UNKNOWN
- `DNSStatus`: RESOLVED, FAILED
- `AlertStatus`: SEND, FAIL
- `IncidentStatus`: ONGOING, RESOLVED

---

## 🤖 AI Layer (`src/services/openAI.ts`)

### 1) `generateAlert(input, opts)` — Down alert message

- Model: `gpt-4o-mini`, temperature 0.3, max 600 tokens
- **Cache:** in-memory `Map`, key = `${endpointId}:${errorType}`, TTL 30 min
- **Rate limit:** 50 calls/hour/user (DB-backed sliding window in `Setting`)
- **Fallback:** returns `null` on rate-limit; caller uses plain template

### 2) `analyzeIncident(input, opts)` — Root cause analysis

- Model: `gpt-4o-mini`, temperature 0.2, max 600 tokens
- **Structured JSON output** via `zodResponseFormat` (OpenAI parse helper)
- Schema:
  ```ts
  {
    category: "NETWORK" | "DNS" | "SSL" | "SERVER" | "APPLICATION" | "UNKNOWN",
    likelyCause: string,
    confidence: "LOW" | "MEDIUM" | "HIGH",
    recommendedActions: string[1..5],
    summary: string,
  }
  ```
- Inputs: incident + last 10 logs + last 5 similar resolved incidents (30-day window)
- **Cache:** in-memory, key = `analysis:${incidentId}`, TTL 1 hour
- **Rate limit:** shares 50/hr quota with `generateAlert`

### 3) `checkAndIncrementAiUsage(prisma, userId)`

Sliding 1-hour window. Resets `aiCallsCount` when `aiCallsResetAt` falls outside the window.

---

## 📊 Statistical Anomaly Detection (`src/lib/anomaly-detector.ts`)

**Free, no LLM.** Runs on every UP check.

- Pulls last 7 days of UP responseTime samples for the endpoint
- Computes mean + stddev (requires ≥20 samples)
- Z-score = (current − mean) / stddev
- Anomaly if z > 2 → marks `Log.isAnomaly = true` + sends DEGRADED notification (throttled 6h)

---

## 🔄 Monitoring Flow (`src/services/run-monitoring.ts`)

```
┌─ Cron tick (Vercel cron OR local node-cron, every 5 min)
│
├─ For each endpoint where nextCheckAt ≤ now:
│   ├─ DNS + SSL + HTTP + content hash (parallel)
│   ├─ Compute new consecutiveDownCount (anti-spam state machine)
│   ├─ INSERT Log (with isAnomaly placeholder)
│   ├─ UPDATE Endpoint (nextCheckAt, lastStatus, consecutiveDownCount)
│   ├─ UPSERT Incident (open / update downtime / resolve)
│   │
│   ├─ if DOWN and shouldAlert:
│   │     generateAlert() → email + slack (kind=DOWN)
│   │     continue;          ← skip anomaly + predictive while DOWN
│   │
│   ├─ if UP + responseTime not null:
│   │     detectResponseTimeAnomaly() → mark Log + DEGRADED alert (6h throttle)
│   │
│   ├─ if SSL valid + expires < 14 days:
│   │     SSL_WARNING alert (7-day throttle)
│   │
│   └─ if non-UP checks in last 24h > 5:
│         UNSTABLE alert (24h throttle)
```

### Anti-spam alert state machine

```
DOWN check 1 → count=1 → ALERT (DOWN)
DOWN check 2 → count=2 → silent
DOWN check 3 → count=3 → silent
DOWN check 4 → count=4 → ALERT (DOWN), reset count to 1
… (cycle repeats every 4 checks while DOWN)
UP check     → count=0 → reset
```

### Notification throttling

| Kind | Throttle window |
|---|---|
| DOWN | counter-based (1st, then every 4th) |
| DEGRADED | 6 hours |
| SSL_WARNING | 7 days |
| UNSTABLE | 24 hours |

Throttling is enforced via `MonitoringService.hasRecentNotification(endpointId, kind, sinceMs)` querying the Notification table.

---

## ⏰ Cron Deployment

**Production (Vercel):**
- `/api/cron/run` (GET) authenticates via `Authorization: Bearer ${CRON_SECRET}`
- Schedule defined in `vercel.json`: `*/5 * * * *`
- `runtime = "nodejs"`, `maxDuration = 300`

**Local dev:**
- `pnpm cron` runs `src/services/cron.ts` (node-cron in-process)
- Logs warning if `NODE_ENV === "production"` (use Vercel cron there)

---

## 🧪 Tests (Vitest)

- `pnpm test` — runs once
- `pnpm test:watch` — watch mode
- Config: `vitest.config.ts` with `@/` alias resolver
- Folder: `test/lib/`

| File | Coverage |
|---|---|
| `test/lib/log-script.test.ts` | `getStatusType`, `classifyError` (HTTP code mapping + error type detection) |
| `test/lib/anomaly-detector.test.ts` | Baseline math, sample size guard, anomaly flagging, edge cases (null, zero/negative samples) |
| `test/lib/enc-dec.test.ts` | AES-256-GCM round-trip, IV uniqueness, tamper detection, unicode/empty/long strings, missing key error |

26 tests across 3 files, ~3s runtime.

---

## 🔌 tRPC Routers

| Router | Procedures |
|---|---|
| `project` | CRUD on Project |
| `endpoint` | CRUD on Endpoint, `getEndpointsByProject`, `getAllEndPoints` |
| `logs` | `getAllLogs`, `getRecentLogs`, `getLog`, `getEndpointsWithIncidents`, `getEndpointIncidentDetail`, `getAllIncidentsTable`, **`analyzeIncident`** (AI root cause), `cleanupOldLogs`, `exportLogs` |
| `dashboardAnalysis` | `getAnalysis`, `getUptimeTrends`, `getResponseTimeTrends`, `getEndpointHealthSummary`, `getNotificationStats`, `getSlowestEndpoints` |
| `userSetting` | `getSettingDetail`, `alertSetting`, `toggleNotifications`, `testNotification` |
| `statusPage` | `create`, `getAll`, `delete`, `getBySlug` (public) |

All incident procedures query the `Incident` table directly — **no in-memory log replay**.

---

## 🎨 UI / UX

### Incident Detail Page (`/dashboard/incidents/[id]`)

- 4 status cards (Root Cause, Status, Duration, Request)
- **AI Root Cause Analysis card** (lazy-load via "Analyze with AI" button)
  - Category badge + confidence badge
  - Summary headline
  - LikelyCause paragraph
  - Numbered recommended actions
- Activity Log + Response (side-by-side, 600px scroll)

### Settings (`/dashboard/user-setting`)

Email + Slack only. WhatsApp removed (May 2026).

---

## 🔐 Environment Variables

See `.env.example` for the canonical list. Required:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Auth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| `SMTP_USER` / `SMTP_PASS` | Email alerts (Gmail App Password) |
| `ENCRYPTION_KEY` | 64-hex chars (32 bytes) for Slack webhook AES-256-GCM |
| `OPENAI_API_KEY` | AI alerts + root cause |
| `CRON_SECRET` | Production cron auth (Vercel) |

---

## 📦 Scripts

```bash
pnpm dev              # Next.js dev server
pnpm build            # Production build
pnpm start            # Production server
pnpm lint             # ESLint
pnpm test             # Vitest (one-shot)
pnpm test:watch       # Vitest watch
pnpm db:push          # Apply Prisma schema to DB
pnpm db:generate      # Regenerate Prisma client
pnpm cron             # Local-only cron runner (dev)
pnpm add:ui <name>    # Shadcn component
```

---

## 📝 Recent Changes (Phase 1 → 4)

### Phase 1 — Quick wins
- `Endpoint.checkInterval` switched to **minutes** (min 5)
- `Endpoint.consecutiveDownCount` added — drives anti-spam alert cadence
- `Setting.whatsappNumber` removed
- `Untitled-2.md` cleanup

### Phase 2 — Architecture
- New **`Incident` model** + `IncidentStatus` enum (no more log-replay)
- `MonitoringService.upsertIncident()` lifecycle (open / update downtime / resolve)
- All incident tRPC procedures refactored to query the table directly
- Production cron via **`/api/cron/run`** + `vercel.json`
- Local `cron.ts` demoted to dev-only

### Phase 3 — AI deepening
- **Statistical anomaly detection** (`src/lib/anomaly-detector.ts`)
- **AI Root Cause Analysis** (`analyzeIncident`) with structured JSON
- AI alert cache (30 min) + per-user rate limit (50/hour)
- Predictive SSL expiry + unstable-endpoint warnings (throttled)
- `Notification.kind` for cleaner throttling
- AI Analysis card on incident detail page

### Phase 4 — Polish
- Vitest setup + 26 tests across 3 files (log-script, anomaly-detector, enc-dec)
- `.env.example`
- Architecture diagram in README
- Docs sync

---

## 🎓 Defense talking points

1. **AI is more than a chat wrapper** — three distinct uses:
   - Generative (alert messages)
   - Diagnostic (root cause analysis with structured output)
   - Statistical (anomaly detection — not even an LLM, but explicit ML)

2. **Cost-aware AI** — two-tier caching (in-memory + DB-backed rate limit), graceful fallback to plain templates on limit

3. **Anti-spam is principled** — counter-based DOWN alerts + per-kind throttle windows, all enforced via the Notification ledger

4. **Production-ready architecture** — Vercel cron + serverless-compatible code path, encrypted secrets, type-safe end-to-end (tRPC + Zod), tested critical paths (Vitest)

5. **Incident model is materialized** — query performance scales linearly with incident count, not log count
