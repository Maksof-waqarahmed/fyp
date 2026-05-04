# AI-Powered Uptime Monitor

Production-grade website uptime monitoring with **AI root cause analysis**, statistical anomaly detection, and predictive warnings — built on Next.js 16, Prisma 7, tRPC, and OpenAI.

---

## ✨ Features

- 🔍 **Multi-project endpoint monitoring** — DNS, SSL, HTTP, content-hash on every check
- 🤖 **AI Root Cause Analysis** — structured JSON diagnosis (category + likely cause + confidence + recommended actions) via GPT-4o-mini
- 📈 **Statistical anomaly detection** — 7-day rolling baseline catches degradation before outage (no LLM, free)
- 🚨 **Smart anti-spam alerts** — counter-based DOWN cadence (1st alert + every 4th)
- 🔮 **Predictive warnings** — SSL expiry (14 days early) + unstable endpoint flagging
- 🧾 **Materialized incident table** — fast queries, no log replay
- 📊 **Dashboard analytics** — uptime trends, response times, slowest endpoints, notification stats
- 🌐 **Public status pages** — 90-day uptime visualization, custom slug
- 🔐 **Encrypted secrets** — AES-256-GCM for Slack webhooks
- ✉️ **Multi-channel alerts** — Email (Nodemailer) + Slack (encrypted webhook)
- 🔑 **OAuth login** — Google + GitHub via Better Auth

---

## 🏗️ Architecture

```mermaid
flowchart LR
    User([👤 User])
    Browser[Next.js UI]
    tRPC[tRPC API Layer]
    Cron{{Vercel Cron<br/>every 5 min}}
    CronRoute[/api/cron/run/]
    Run[runEndpointMonitoring]
    Probes[DNS / SSL / HTTP /<br/>Content checks]
    Anomaly[Anomaly Detector<br/>z-score baseline]
    AI[OpenAI Layer<br/>cache + rate limit]
    DB[(PostgreSQL<br/>Prisma)]
    Mail[📧 Nodemailer]
    Slack[💬 Slack Webhook]

    User --> Browser
    Browser --> tRPC
    tRPC --> DB
    tRPC -.AI Analysis<br/>on demand.-> AI

    Cron --> CronRoute
    CronRoute --> Run
    Run --> Probes
    Probes --> DB
    Run --> Anomaly
    Anomaly --> DB
    Run --> AI
    AI --> Mail
    AI --> Slack
    Run --> Mail
    Run --> Slack
```

### Per-tick monitoring flow

```mermaid
flowchart TD
    Start([Cron tick]) --> Fetch[Fetch endpoints<br/>where nextCheckAt ≤ now]
    Fetch --> Loop{For each endpoint}
    Loop --> Check[Parallel: DNS / SSL / HTTP / content]
    Check --> Counter[Update consecutiveDownCount]
    Counter --> WriteLog[INSERT Log]
    WriteLog --> WriteEp[UPDATE Endpoint]
    WriteEp --> Incident{{UPSERT Incident}}
    Incident --> IsDown{Is DOWN?}

    IsDown -->|yes + shouldAlert| AIAlert[generateAlert<br/>cached]
    AIAlert --> Dispatch1[📧 Email + 💬 Slack<br/>kind=DOWN]
    Dispatch1 --> Loop

    IsDown -->|no, UP| AnomalyCheck[detectResponseTimeAnomaly]
    AnomalyCheck --> AnomalyHit{z &gt; 2?}
    AnomalyHit -->|yes| Mark[Mark Log.isAnomaly]
    Mark --> Dispatch2[Alert kind=DEGRADED<br/>6h throttle]
    Dispatch2 --> SSLCheck

    AnomalyHit -->|no| SSLCheck[SSL expiry &lt; 14d?]
    SSLCheck -->|yes| Dispatch3[Alert kind=SSL_WARNING<br/>7d throttle]
    Dispatch3 --> Unstable
    SSLCheck -->|no| Unstable[24h failures &gt; 5?]
    Unstable -->|yes| Dispatch4[Alert kind=UNSTABLE<br/>24h throttle]
    Dispatch4 --> Loop
    Unstable -->|no| Loop
```

### Anti-spam alert state machine

```mermaid
stateDiagram-v2
    [*] --> count_0
    count_0 --> count_1: DOWN
    count_1: count=1<br/>🚨 ALERT
    count_1 --> count_2: DOWN
    count_2: count=2<br/>silent
    count_2 --> count_3: DOWN
    count_3: count=3<br/>silent
    count_3 --> count_4: DOWN
    count_4: count=4<br/>🚨 ALERT<br/>then reset to 1
    count_4 --> count_2_again: DOWN
    count_2_again: count=2 (cycle)
    count_1 --> count_0: UP
    count_2 --> count_0: UP
    count_3 --> count_0: UP
    count_4 --> count_0: UP
    count_0: count=0<br/>healthy
```

---

## ⚙️ Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd fyp
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="<openssl rand -hex 32>"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
SMTP_USER="your@gmail.com"
SMTP_PASS="<gmail-app-password>"
ENCRYPTION_KEY="<openssl rand -hex 32>"
OPENAI_API_KEY="sk-..."
CRON_SECRET="<openssl rand -hex 32>"   # production only
```

### 3. Database

```bash
pnpm db:push        # apply schema
pnpm db:generate    # regenerate Prisma client
```

### 4. Run

```bash
pnpm dev            # http://localhost:3000
pnpm cron           # local monitoring (separate terminal)
```

---

## 🚀 Production deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add all env vars (including `CRON_SECRET`)
4. Deploy — `vercel.json` registers the cron job automatically

The local `pnpm cron` script is **not** used in production. Vercel Cron hits `/api/cron/run` every 5 minutes.

---

## 🧪 Tests

```bash
pnpm test          # vitest run
pnpm test:watch    # watch mode
```

26 tests covering: HTTP code classification, network error classification, anomaly detector baseline math + thresholds, AES-256-GCM round-trip + tamper detection.

---

## 📦 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind v4, Shadcn UI |
| API | tRPC 11, Zod |
| Auth | Better Auth (Google + GitHub OAuth) |
| Database | PostgreSQL via Prisma 7 |
| AI | OpenAI gpt-4o-mini (alerts + structured root cause) |
| Alerts | Nodemailer (email) + axios (Slack webhook, encrypted) |
| Cron | Vercel Cron (prod) / node-cron (dev) |
| Tests | Vitest |

---

## 📚 Documentation

- [`agent.md`](agent.md) — full system context for AI assistants
- [`project_structure.md`](project_structure.md) — folder map + module reference
- [`.env.example`](.env.example) — env var reference

---

## 🔗 References

- [Next.js](https://nextjs.org/docs) · [Prisma](https://www.prisma.io/docs) · [tRPC](https://trpc.io/docs) · [Better Auth](https://docs.better-auth.com)
- [OpenAI structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Vercel Cron](https://vercel.com/docs/cron-jobs)
- [Shadcn UI](https://ui.shadcn.com/docs)
