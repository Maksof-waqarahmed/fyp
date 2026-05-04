# AI-Powered Uptime Monitor — Project Structure

## Overview

Next.js 16 + Prisma 7 + tRPC 11 + OpenAI uptime monitoring system with **statistical anomaly detection**, **AI root cause analysis**, encrypted Slack webhooks, and public status pages.

---

## Folder Structure

```
fyp/
├── prisma/
│   └── schema.prisma          # Postgres schema (User, Project, Endpoint, Log, Incident, Setting, Notification, StatusPage)
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts    # Better Auth handler
│   │   │   ├── trpc/[trpc]/route.ts      # tRPC entrypoint
│   │   │   └── cron/run/route.ts         # Vercel Cron entrypoint (auth via CRON_SECRET)
│   │   ├── auth/signin/                  # OAuth signin page
│   │   ├── dashboard/                    # Protected dashboard
│   │   │   ├── _components/              # Sidebar, header, terminal, recent-activity, etc.
│   │   │   ├── incidents/                # Incident list + detail (with AI Analysis card)
│   │   │   ├── monitoring/               # Projects, endpoints, logs
│   │   │   ├── status-pages/             # Public status page configs
│   │   │   └── user-setting/             # Notification prefs (email + slack)
│   │   ├── status/[slug]/page.tsx        # Public status page (no auth, direct Prisma)
│   │   └── layout.tsx
│   ├── components/ui/                    # Shadcn primitives
│   ├── hooks/                            # use-mobile, etc.
│   ├── lib/
│   │   ├── auth.ts / auth-client.ts / auth-sever.ts   # Better Auth
│   │   ├── enc-dec.ts                    # AES-256-GCM (Slack webhook encryption)
│   │   ├── log-script.ts                 # DNS / SSL / HTTP / content-hash checks
│   │   ├── monitoring-service.ts         # MonitoringService class (DB ops + incident lifecycle)
│   │   ├── anomaly-detector.ts           # Rolling baseline z-score anomaly detection
│   │   ├── prisma.ts                     # Prisma client singleton
│   │   └── utils.ts
│   ├── schemas/                          # Zod input schemas
│   ├── services/
│   │   ├── alert-services.ts             # Email (Nodemailer) + Slack (axios)
│   │   ├── cron.ts                       # LOCAL-DEV cron (node-cron) — prod uses Vercel Cron
│   │   ├── openAI.ts                     # generateAlert + analyzeIncident + cache + rate limit
│   │   └── run-monitoring.ts             # Per-tick orchestrator
│   ├── trpc/                             # tRPC routers
│   │   ├── api/router/
│   │   │   ├── project/, endPoint/, log/, dashboard-analysis/,
│   │   │   ├── user-setting/, status-page/
│   │   │   └── routes.ts                 # Composed appRouter
│   │   ├── trpc.ts                       # protectedProcedure + ctx
│   │   └── trpc-server/ (server.ts, react.tsx)
│   └── types/                            # Frontend types (incidents, logs, projects, endpoints)
├── test/
│   └── lib/
│       ├── log-script.test.ts            # Status code + error classification
│       ├── anomaly-detector.test.ts      # Baseline math, threshold, edge cases
│       └── enc-dec.test.ts               # AES round-trip + tamper detection
├── vercel.json                           # Vercel Cron config (every 5 min → /api/cron/run)
├── vitest.config.ts                      # Vitest runner with @/ alias
├── .env.example
├── README.md
├── agent.md
└── project_structure.md
```

---

## Database Schema (`prisma/schema.prisma`)

| Model | Key behavior |
|---|---|
| **User** | OAuth users, has `setting`, `projects`, `statusPages` |
| **Project** | Soft-deletable, owns `endpoints` |
| **Endpoint** | `checkInterval` (minutes, ≥5), `consecutiveDownCount` (anti-spam state), `nextCheckAt`, `lastStatus`, has `logs`, `notifications`, `incidents` |
| **Setting** | One per user. Encrypted Slack webhook (3 fields), `aiCallsCount` + `aiCallsResetAt` for rate limit |
| **Log** | Each check; `status`, `httpCode`, `responseTime`, `dnsStatus`, `sslValid`, `sslExpiry`, `contentHash`, `isAnomaly` |
| **Notification** | `type` (EMAIL/SLACK) + `kind` (DOWN/DEGRADED/SSL_WARNING/UNSTABLE) + status + metadata. Composite index on `(endpointId, kind, sentAt)` for throttle queries |
| **Incident** | `status` ONGOING/RESOLVED, `startedAt`, `recoveredAt`, `downtimeMs`, `triggerStatus`, `triggerLogId`, `errorMessage`, `httpCode`. Indexed on `(endpointId, status)` and `(status, startedAt)` |
| **StatusPage** | M:N with Project. Public via slug |

**Enums:** `HTTPStatus`, `DNSStatus`, `AlertStatus`, `IncidentStatus`

---

## Key Modules

### `src/lib/log-script.ts` — Network probes
- `checkDNS(hostname)` — DNS resolution
- `checkSSL(hostname)` — TLS cert validity + expiry
- `checkEndpoint(url)` — HTTP fetch with 8s timeout, returns status type
- `getContentHash(url)` — SHA-256 of response body
- `getStatusType(code)` — map HTTP code to enum
- `classifyError(err)` — TIMEOUT / DNS_NOT_FOUND / CONNECTION_REFUSED / CONNECTION_RESET / SSL_ERROR / NETWORK_ERROR

### `src/lib/anomaly-detector.ts` — Statistical performance regression
- `detectResponseTimeAnomaly(prisma, endpointId, currentMs)`
- 7-day rolling baseline (mean + stddev) of UP responseTime samples
- Returns `{ isAnomaly, baseline: { mean, stddev, sampleSize } | null, zScore }`
- Requires ≥20 samples, threshold z > 2

### `src/lib/monitoring-service.ts` — DB orchestrator class
- `getEndPoints()` — endpoints due for check (with project + user + setting joined)
- `createLogs(...)` — INSERT Log, returns the row
- `updateEndPoints(endpoint, httpResult, consecutiveDownCount)` — UPDATE endpoint state
- `upsertIncident(endpoint, httpResult, log)` — open / update / resolve Incident
- `markLogAnomaly(logId)` — set isAnomaly = true
- `createNotification(type, message, endpoint, result, kind)` — INSERT Notification
- `hasRecentNotification(endpointId, kind, sinceMs)` — throttle check
- `countTransientFailures(endpointId, sinceMs)` — for UNSTABLE warning

### `src/services/openAI.ts` — AI layer
- `generateAlert(input, opts)` — DOWN alert message (cached 30 min by `endpointId:errorType`)
- `analyzeIncident(input, opts)` — structured JSON root cause (cached 1 hour by incidentId)
- `checkAndIncrementAiUsage(prisma, userId)` — sliding 1-hour rate limit (50/hr)

### `src/services/run-monitoring.ts` — Per-tick orchestrator
1. Fetch due endpoints
2. For each: parallel DNS / SSL / HTTP / content checks
3. Compute new `consecutiveDownCount` and `shouldAlert`
4. Persist Log, Endpoint, Incident
5. If DOWN + alert: dispatch DOWN notification (AI message)
6. If UP: anomaly detection → DEGRADED notification (6h throttle)
7. SSL expiry check → SSL_WARNING (7d throttle)
8. 24h failure count → UNSTABLE (24h throttle)

---

## tRPC Routers

| Router | File | Procedures |
|---|---|---|
| `project` | `trpc/api/router/project/index.ts` | CRUD |
| `endpoint` | `trpc/api/router/endPoint/index.ts` | CRUD + getByProject |
| `logs` | `trpc/api/router/log/index.ts` | logs + incidents + **`analyzeIncident`** + export |
| `dashboardAnalysis` | `trpc/api/router/dashboard-analysis/index.ts` | summary, trends, slowest, notification stats |
| `userSetting` | `trpc/api/router/user-setting/index.ts` | settings + test notification |
| `statusPage` | `trpc/api/router/status-page/index.ts` | CRUD + `getBySlug` (public) |

---

## Cron Architecture

**Production:** Vercel Cron → GET `/api/cron/run` with `Authorization: Bearer ${CRON_SECRET}` → `runEndpointMonitoring()`. Schedule in `vercel.json`.

**Dev:** `pnpm cron` runs `src/services/cron.ts` (in-process node-cron, every 5 min). Warns if NODE_ENV=production.

---

## Tests

```bash
pnpm test           # one-shot
pnpm test:watch     # watch mode
```

Vitest config in `vitest.config.ts` with `@/` alias resolution. 26 tests across 3 files in `test/lib/`.

---

## Quick reference: where things live

| Need to … | Look at |
|---|---|
| Add a new alert channel | `src/services/alert-services.ts` + `run-monitoring.ts` dispatch |
| Tune anomaly threshold | `src/lib/anomaly-detector.ts` (`Z_SCORE_THRESHOLD`, `MIN_SAMPLES`) |
| Tune anti-spam cadence | `src/services/run-monitoring.ts` (`SILENT_CHECKS_BETWEEN_ALERTS`) |
| Tune throttle windows | `run-monitoring.ts` (top of file) |
| Adjust AI rate limit | `src/services/openAI.ts` (`AI_CALLS_PER_HOUR`) |
| Change cron schedule | `vercel.json` + (dev) `src/services/cron.ts` |
| Add tRPC procedure | new router in `src/trpc/api/router/`, register in `routes.ts` |
| Modify schema | `prisma/schema.prisma` → `pnpm db:push && pnpm db:generate` |
| Add DB-backed test | extend `test/lib/` with a fake-prisma stub (see `anomaly-detector.test.ts` for pattern) |
