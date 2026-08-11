# 🎯 FYP Demo Guide — AI-Powered Uptime & Security Monitor

> Ye guide demo ke liye hai. Terminal 1 mein app chalao, Terminal 2 mein jab data chahiye `pnpm demo:check`. Baaki sab browser mein click-click.

---

## 📦 0. Ye project hai kya (30-second pitch)

Ek **AI-Powered Uptime & Security Monitor** — websites ko 24/7 monitor karta hai, down hone pe alert bhejta hai, **AI se root cause** batata hai, **security vulnerabilities** scan karta hai, aur **ML se predict** karta hai ke koi site future mein fail hone wali hai.

**Teen intelligence layers** (ye line zaroor bolna):
1. **Statistical** — anomaly detection (z-score)
2. **Predictive ML** — failure risk + response-time forecasting (LLM nahi, pure regression)
3. **LLM (AI)** — root cause diagnosis + security triage

---

## ⚙️ 1. Setup (demo se ~15 min pehle)

**Terminal 1 — app chalao:**
```bash
pnpm install        # agar pehle nahi kiya
pnpm dev            # http://localhost:3000
```

**`.env` check karo** — ye zaroori hain:
| Var | Kis liye |
|---|---|
| `DATABASE_URL` | Database (Neon) |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET` | Login |
| `OPENAI_API_KEY` | AI features (**na ho to bhi app chalega**, bas AI ki jagah plain text) |
| `SMTP_USER` / `SMTP_PASS` | Email alerts (Gmail App Password) |

---

## 🔑 2. Monitoring kaise chalti hai (cron ka masla)

Production (Vercel) mein har 5 min Vercel khud `/api/cron/run` API ko hit karta hai. **Local par Vercel nahi hai**, isliye 3 tareeke:

| Tareeka | Command | Kab |
|---|---|---|
| **One-shot (DEMO ⭐)** | `pnpm demo:check` | **Yehi use karo** — turant check chala deta hai |
| Background cron | `pnpm cron` | Har 5 min khud (pehla run 5 min baad) |
| API hit | `curl` (neeche) | Manually production-style trigger |

### ⭐ `pnpm demo:check` (recommended)
Ye command demo ke liye khaas banayi gayi hai. Ye:
1. Saare endpoints ko foran **"due"** karta hai (warna naye endpoint 5 min tak check nahi hote)
2. Ek monitoring pass turant chalata hai (DNS + SSL + HTTP + content-hash)
3. Security scans bhi chala deta hai

Jab bhi fresh data chahiye — Terminal 2 mein:
```bash
pnpm demo:check
```
Phir dashboard **refresh** karo.

### API manually hit karna (agar coordinator "production cron dikhao" bole)
`.env` mein `CRON_SECRET` set karo, phir:

**Git Bash:**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/run
```
**PowerShell:**
```powershell
curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/run
```
Return: `{ ok: true, durationMs: ... }` → monitoring chal gayi.

> **Bolna:** "Sir, local par Vercel Cron nahi hota, isliye maine wahi API endpoint banaya hai jise production mein Vercel har 5 min automatically hit karta hai."

---

## 🎬 3. Live Demo Flow (step-by-step)

### Tayyari (demo se pehle)
1. `http://localhost:3000` → **Login** (Google/GitHub)
2. **Create Project** → naam do
3. **Add Endpoints** — 2 daalo taake UP aur DOWN dono dikhein:
   - ✅ Healthy: `https://www.google.com`
   - ❌ Down: `https://this-site-does-not-exist-12345.com`
4. Terminal 2: **`pnpm demo:check`** → dashboard refresh

### Ab ek-ek page dikhao:

**1️⃣ Dashboard** — "Total endpoints, uptime %, response times, recent activity ek nazar mein."

**2️⃣ Monitoring → Logs** — "Har check yahan log hota hai — HTTP code, response time, DNS, SSL. Google UP, fake site DOWN."

**3️⃣ Incidents (⭐ AI)** — "Down hone pe automatically incident banta hai."
- Down incident pe click → **"Analyze with AI"** → GPT structured diagnosis: category + likely cause + confidence + recommended actions.

**4️⃣ Security (⭐ cybersecurity)** — "Poora security scanner."
- Endpoint pe **"Run Scan"** → **A–F grade** + 7 categories (headers, TLS, exposed files, cookies, HTTPS, DNS/email, tech).
- **"Triage with AI"** → GPT vulnerabilities ko severity se prioritize karke remediation plan deta hai.

**5️⃣ Predictive Health (⭐ real ML)** — "ML se predict karta hai kaunsi site fail hone wali hai — bina LLM ke, pure statistics."
- Risk score (0–100) + level, response-time **forecast** (regression), aur **explainable factors** (har risk ka reason).
- "Black-box nahi — har prediction ke saath 'kyun' bhi milta hai."

**6️⃣ Status Pages** — "Public status page, 90-din uptime, custom URL, password option."

**7️⃣ User Settings** — "Email + Slack alerts. Slack webhook **AES-256 encrypted**. **Test Notification** se live email bhej ke dikhao."

---

## 📋 4. Saare Features + kaise explain karo

| # | Feature | Ek line explanation |
|---|---|---|
| 1 | Multi-check monitoring | DNS + SSL + HTTP + content-hash — 4 cheezein parallel |
| 2 | Anti-spam alerts | Down pe pehla + har 4th alert — inbox flood nahi |
| 3 | AI Root Cause | GPT structured JSON diagnosis |
| 4 | Statistical anomaly | 7-din baseline z-score — outage se pehle warn |
| 5 | Content-change detection | SHA-256 hash compare — defacement detect |
| 6 | SSL expiry warning | Cert expire hone se 14 din pehle |
| 7 | Unstable endpoint | Baar-baar flap kare to flag |
| 8 | Security scanner | 7-category → A–F grade |
| 9 | AI security triage | Vulnerabilities prioritize + remediation |
| 10 | Predictive ML | Failure risk + response-time forecast |
| 11 | Incident tracking | Dedicated table — fast, no log-replay |
| 12 | Public status pages | 90-day uptime, custom slug |
| 13 | Encrypted secrets | Slack webhook AES-256-GCM |
| 14 | Multi-channel alerts | Email + Slack |
| 15 | OAuth login | Google + GitHub (Better Auth) |
| 16 | Cost-aware AI | Cache + 50/hr rate limit + fallback |
| 17 | 64 tests | Vitest — critical logic tested |

---

## 🛡️ 5. Coordinator ke likely sawal + jawab

**"AI to bas ChatGPT API call hai na?"**
> "Nahi Sir — 3 alag layers hain. Anomaly detection pure statistics, prediction real regression-based ML — dono LLM nahi. GPT sirf explanation/diagnosis layer hai, aur woh bhi cached + rate-limited."

**"OpenAI ka kharcha kaun bharega?"**
> "2-tier caching + per-user 50/hr rate limit + limit hit hone pe plain-template fallback. AI on-demand chalti hai, har check pe nahi."

**"Production mein chalega?"**
> "Haan — Vercel Cron + serverless-ready, `vercel.json` mein schedule, secrets encrypted, end-to-end type-safe (tRPC + Zod), 64 tests."

**"Tech stack?"**
> "Next.js 16, React 19, Prisma 7 + PostgreSQL, tRPC 11, Better Auth, OpenAI, Vitest — sab latest."

**"Scale kaise karega?"**
> "Incidents materialized table (no log-replay), indexed queries, cron batching. Future: multi-region checks + Redis cache."

---

## ⏱️ Final Checklist (demo se pehle)

- [ ] `pnpm dev` chal raha hai (Terminal 1)
- [ ] `.env` bhara hai (`OPENAI_API_KEY` AI ke liye)
- [ ] Login ho chuka
- [ ] 1 healthy + 1 down endpoint added
- [ ] `pnpm demo:check` ek baar chala liya → dashboard mein data hai
- [ ] Security "Run Scan" + "Triage with AI" test kiya
- [ ] Incident pe "Analyze with AI" test kiya
- [ ] "Test Notification" se email aa raha hai

---

## 🐛 Troubleshooting

| Masla | Hal |
|---|---|
| Dashboard khaali | `pnpm demo:check` chalao, phir refresh |
| Naya endpoint check nahi ho raha | `pnpm demo:check` (ye `nextCheckAt` reset kar deta hai) |
| AI features kaam nahi kar rahe | `.env` mein `OPENAI_API_KEY` check karo |
| Email nahi aa raha | `SMTP_USER` / `SMTP_PASS` (Gmail **App Password**, normal password nahi) |
| Slack "404 failed" | Slack webhook expire/invalid hai — demo mein email use karo (Slack optional) |
| `/api/cron/run` 401/500 | `.env` mein `CRON_SECRET` set karo aur bearer token match karo |
