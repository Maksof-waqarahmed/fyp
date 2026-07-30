import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import z from "zod";
import { PrismaClient } from "../../prisma/generated/prisma/client";

export const OPENAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ────────────────────────────────────────────────────────────────────────
// In-memory caches (process-local; reset on cold start)
//
// NOTE (serverless): on Vercel each cron tick may be a fresh instance, so these
// Maps do NOT persist across invocations. They still de-duplicate work *within*
// a single run. The durable layers that DO survive cold starts are:
//   - Root-cause analysis → persisted to Incident.aiAnalysis (see log router)
//   - Rate limiting        → persisted to Setting.aiCallsCount (DB-backed below)
// A cross-instance shared cache (e.g. Redis / Upstash) is the planned next step.
// ────────────────────────────────────────────────────────────────────────

const ALERT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ANALYSIS_TTL_MS = 60 * 60 * 1000; // 1 hour

type CacheEntry<T> = { value: T; expiresAt: number };

const alertCache = new Map<string, CacheEntry<string>>();
const analysisCache = new Map<string, CacheEntry<RootCauseAnalysis>>();

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        map.delete(key);
        return null;
    }
    return entry.value;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
    map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ────────────────────────────────────────────────────────────────────────
// Per-user rate limit (sliding 1-hour window persisted in Setting)
// ────────────────────────────────────────────────────────────────────────

const AI_CALLS_PER_HOUR = 50;

export async function checkAndIncrementAiUsage(
    prisma: PrismaClient,
    userId: string
): Promise<{ allowed: boolean; remaining: number }> {
    const setting = await prisma.setting.findUnique({
        where: { userId },
        select: { aiCallsCount: true, aiCallsResetAt: true },
    });

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000);

    let count = setting?.aiCallsCount ?? 0;
    let resetAt = setting?.aiCallsResetAt ?? null;

    if (!resetAt || resetAt < windowStart) {
        count = 0;
        resetAt = now;
    }

    if (count >= AI_CALLS_PER_HOUR) {
        return { allowed: false, remaining: 0 };
    }

    await prisma.setting.upsert({
        where: { userId },
        update: { aiCallsCount: count + 1, aiCallsResetAt: resetAt },
        create: { userId, aiCallsCount: 1, aiCallsResetAt: now, isActive: true },
    });

    return { allowed: true, remaining: AI_CALLS_PER_HOUR - (count + 1) };
}

// ────────────────────────────────────────────────────────────────────────
// 1) Alert message generation (with cache + rate limit)
// ────────────────────────────────────────────────────────────────────────

const WebsiteStatusSchema = z.object({
    status: z.enum(["UP", "DOWN"]),
    httpCode: z.number().nullable(),
    responseTime: z.number().nullable(),
    errorMessage: z.string().nullable(),
    dnsStatus: z.string(),
    ip: z.string().nullable(),
    sslValid: z.boolean(),
    sslExpiry: z.string().nullable(),
    checkedAt: z.string(),
    contentHash: z.string().nullable(),
    contentLength: z.number().nullable(),
    userName: z.string(),
    projectName: z.string(),
    endpointName: z.string(),
    endpointUrl: z.string(),
});

type WebsiteStatus = z.infer<typeof WebsiteStatusSchema>;

export type GenerateAlertOptions = {
    endpointId: string;
    userId: string;
    prisma: PrismaClient;
};

export async function generateAlert(
    input: WebsiteStatus,
    opts: GenerateAlertOptions
): Promise<string | null> {
    const validInput = WebsiteStatusSchema.parse(input);

    const errorType = validInput.errorMessage ?? "UNKNOWN";
    const cacheKey = `${opts.endpointId}:${errorType}`;

    const cached = cacheGet(alertCache, cacheKey);
    if (cached) {
        console.log(`💾 alert cache hit for ${cacheKey}`);
        return cached;
    }

    const usage = await checkAndIncrementAiUsage(opts.prisma, opts.userId);
    if (!usage.allowed) {
        console.warn(`🚫 AI rate limit hit for user ${opts.userId} — falling back to plain alert`);
        return null;
    }

    const prompt = `
You are an AI alert generator for a website uptime monitoring system. You will receive a structured input object containing website status information. Your task is to **create a professional, detailed, and clear alert message** that can be sent to clients whenever a website is down. The message should highlight key information: user name, project name, endpoint name/URL, status, error, DNS, SSL, and actionable suggestions.

**Input Object:**
${JSON.stringify(validInput, null, 2)}

**Requirements for the Alert Message:**
1. Only generate the alert if the website status is "DOWN".
2. Start with a greeting using the user's name.
3. Include user name, project name, endpoint name/URL, status, HTTP code, error, response time, DNS, IP, SSL, timestamp.
4. Use bullet points or sections for clarity. Use emojis sparingly.
5. End with a **💡 Suggestion** section with 2-3 actionable recommendations based on the specific error.
6. If IP or contentHash is null, show "N/A".

Respond ONLY with the formatted alert, no extra text.
`;

    try {
        const response = await OPENAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 600,
        });

        const message = response.choices?.[0]?.message?.content ?? "";
        if (message) {
            cacheSet(alertCache, cacheKey, message, ALERT_TTL_MS);
        }
        return message;
    } catch (error) {
        console.error("Error generating alert:", error);
        return null;
    }
}

// ────────────────────────────────────────────────────────────────────────
// 2) Root cause analysis (structured JSON, cached per-incident)
// ────────────────────────────────────────────────────────────────────────

export const RootCauseAnalysisSchema = z.object({
    category: z.enum(["NETWORK", "DNS", "SSL", "SERVER", "APPLICATION", "UNKNOWN"]),
    likelyCause: z.string(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    recommendedActions: z.array(z.string()).min(1).max(5),
    summary: z.string(),
});

export type RootCauseAnalysis = z.infer<typeof RootCauseAnalysisSchema>;

export type AnalyzeIncidentInput = {
    incident: {
        id: string;
        startedAt: string;
        recoveredAt: string | null;
        downtimeMs: number;
        triggerStatus: string;
        errorMessage: string | null;
        httpCode: number | null;
    };
    endpoint: {
        name: string;
        url: string;
    };
    recentLogs: Array<{
        status: string;
        httpCode: number | null;
        errorMessage: string | null;
        dnsStatus: string;
        sslValid: boolean;
        responseTime: number | null;
        checkedAt: string;
    }>;
    similarPastIncidents: Array<{
        startedAt: string;
        downtimeMs: number;
        errorMessage: string | null;
    }>;
};

export type AnalyzeIncidentOptions = {
    incidentId: string;
    userId: string;
    prisma: PrismaClient;
};

export async function analyzeIncident(
    input: AnalyzeIncidentInput,
    opts: AnalyzeIncidentOptions
): Promise<RootCauseAnalysis | null> {
    const cacheKey = `analysis:${opts.incidentId}`;

    const cached = cacheGet(analysisCache, cacheKey);
    if (cached) {
        console.log(`💾 analysis cache hit for ${cacheKey}`);
        return cached;
    }

    const usage = await checkAndIncrementAiUsage(opts.prisma, opts.userId);
    if (!usage.allowed) {
        console.warn(`🚫 AI rate limit hit for user ${opts.userId} — analysis skipped`);
        return null;
    }

    const systemPrompt = `You are an SRE diagnostician analyzing website downtime incidents. Given an incident, recent monitoring logs, and similar past incidents, identify the most likely root cause category and provide actionable recommendations. Be precise — confidence should reflect actual evidence in the data, not optimism.

Categories:
- NETWORK: connection refused, reset, packet loss
- DNS: resolution failures
- SSL: certificate problems
- SERVER: 5xx errors, timeouts (server overloaded)
- APPLICATION: 4xx errors, content errors
- UNKNOWN: insufficient signal`;

    const userPrompt = `Analyze this incident and return structured JSON.

**Endpoint:** ${input.endpoint.name} (${input.endpoint.url})

**Incident:**
${JSON.stringify(input.incident, null, 2)}

**Recent logs (most recent first):**
${JSON.stringify(input.recentLogs.slice(0, 10), null, 2)}

**Similar past incidents (last 30 days):**
${JSON.stringify(input.similarPastIncidents.slice(0, 5), null, 2)}

Return:
- category: best-fit category
- likelyCause: 1-2 sentence specific diagnosis
- confidence: HIGH only if evidence is clear and consistent
- recommendedActions: 2-5 specific, ordered actions an operator should take
- summary: one-line headline for a dashboard card`;

    try {
        const response = await OPENAI.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 600,
            response_format: zodResponseFormat(RootCauseAnalysisSchema, "incident_analysis"),
        });

        const parsed = response.choices?.[0]?.message?.parsed ?? null;
        if (parsed) {
            cacheSet(analysisCache, cacheKey, parsed, ANALYSIS_TTL_MS);
        }
        return parsed;
    } catch (error) {
        console.error("Error analyzing incident:", error);
        return null;
    }
}
