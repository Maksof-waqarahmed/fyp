import { PrismaClient } from "../../prisma/generated/prisma/client";

// ────────────────────────────────────────────────────────────────────────
// Explainable failure-risk prediction.
//
// This is deliberately NOT an LLM. It's a transparent statistical model:
//   - least-squares linear regression for the response-time trend/forecast
//   - a weighted, fully-explainable risk score built from real signals
// Every point of the score is attributable to a named factor, so the UI can
// show *why* an endpoint is at risk — something a black-box model can't.
// ────────────────────────────────────────────────────────────────────────

const MIN_SAMPLES = 10;
const RECENT_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h "recent" error window
const HISTORY_DAYS = 7;

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskFactor = {
    name: string;
    points: number; // contribution to the 0-100 score
    detail: string;
};

export type PredictionFeatures = {
    sampleSize: number;
    errorRate: number; // 0-1 over the whole window
    recentErrorRate: number; // 0-1 over the last 6h
    responseTimeSlope: number; // ms per hour (regression slope)
    responseTimeZScore: number; // current vs baseline
    consecutiveDownCount: number;
    sslDaysToExpiry: number | null;
    incidentsLast7d: number;
};

export type PredictionResult = {
    hasEnoughData: boolean;
    riskScore: number; // 0-100
    riskLevel: RiskLevel;
    factors: RiskFactor[];
    forecast: {
        currentResponseTime: number | null;
        predictedResponseTimeIn24h: number | null;
        trend: "improving" | "stable" | "degrading";
    };
    features: PredictionFeatures | null;
};

// ── Pure math ────────────────────────────────────────────────────────────

// Least-squares linear regression. Returns slope + intercept for y = slope*x + intercept.
export function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };

    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumXX = xs.reduce((a, x) => a + x * x, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

function levelFromScore(score: number): RiskLevel {
    if (score >= 70) return "CRITICAL";
    if (score >= 45) return "HIGH";
    if (score >= 20) return "MEDIUM";
    return "LOW";
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Transparent weighted risk model. Each signal contributes a bounded number of
// points with a human-readable reason; the total is clamped to 0-100.
export function computeRiskScore(f: PredictionFeatures): { score: number; factors: RiskFactor[] } {
    const factors: RiskFactor[] = [];

    // Recent failures are the strongest near-term signal (up to 40 pts).
    if (f.recentErrorRate > 0) {
        const points = Math.round(f.recentErrorRate * 40);
        factors.push({
            name: "Recent failures",
            points,
            detail: `${Math.round(f.recentErrorRate * 100)}% of the last 6h of checks failed`,
        });
    }

    // Baseline error rate over the whole window (up to 15 pts).
    if (f.errorRate > 0) {
        const points = Math.round(f.errorRate * 15);
        if (points > 0)
            factors.push({
                name: "Overall error rate",
                points,
                detail: `${Math.round(f.errorRate * 100)}% failures over the last ${HISTORY_DAYS} days`,
            });
    }

    // Response-time degradation trend (up to 10 pts): 50ms/hour rise = full weight.
    if (f.responseTimeSlope > 0) {
        const points = Math.round(clamp(f.responseTimeSlope / 50, 0, 1) * 10);
        if (points > 0)
            factors.push({
                name: "Slowing response time",
                points,
                detail: `Response time trending up ~${Math.round(f.responseTimeSlope)}ms/hour`,
            });
    }

    // Current response time far above baseline (up to 15 pts).
    if (f.responseTimeZScore > 2) {
        const points = Math.round(clamp((f.responseTimeZScore - 2) * 5, 0, 15));
        if (points > 0)
            factors.push({
                name: "Response-time spike",
                points,
                detail: `Latest response is ${f.responseTimeZScore.toFixed(1)}σ above the baseline`,
            });
    }

    // Currently in a down streak (up to 20 pts).
    if (f.consecutiveDownCount > 0) {
        const points = Math.round((Math.min(f.consecutiveDownCount, 3) / 3) * 20);
        factors.push({
            name: "Active down streak",
            points,
            detail: `${f.consecutiveDownCount} consecutive failed check(s) right now`,
        });
    }

    // SSL nearing expiry — a scheduled, predictable outage (up to 10 pts).
    if (f.sslDaysToExpiry !== null && f.sslDaysToExpiry < 14) {
        const points = Math.round((clamp(14 - f.sslDaysToExpiry, 0, 14) / 14) * 10);
        if (points > 0)
            factors.push({
                name: "SSL expiry approaching",
                points,
                detail: `Certificate expires in ${f.sslDaysToExpiry} day(s)`,
            });
    }

    // Flapping / instability over the week (up to 10 pts).
    if (f.incidentsLast7d > 0) {
        const points = Math.round((Math.min(f.incidentsLast7d, 5) / 5) * 10);
        factors.push({
            name: "Recent instability",
            points,
            detail: `${f.incidentsLast7d} incident(s) in the last 7 days`,
        });
    }

    const total = factors.reduce((a, b) => a + b.points, 0);
    const score = clamp(total, 0, 100);
    factors.sort((a, b) => b.points - a.points);
    return { score, factors };
}

// ── Orchestrator (I/O) ────────────────────────────────────────────────────

export async function predictEndpointFailure(
    prisma: PrismaClient,
    endpointId: string
): Promise<PredictionResult> {
    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);

    const [endpoint, logs, incidentsLast7d] = await Promise.all([
        prisma.endpoint.findUnique({
            where: { id: endpointId },
            select: { consecutiveDownCount: true },
        }),
        prisma.log.findMany({
            where: { endpointId, checkedAt: { gte: since } },
            select: { status: true, responseTime: true, checkedAt: true, sslExpiry: true },
            orderBy: { checkedAt: "asc" },
        }),
        prisma.incident.count({ where: { endpointId, startedAt: { gte: since } } }),
    ]);

    const empty: PredictionResult = {
        hasEnoughData: false,
        riskScore: 0,
        riskLevel: "LOW",
        factors: [],
        forecast: { currentResponseTime: null, predictedResponseTimeIn24h: null, trend: "stable" },
        features: null,
    };

    if (logs.length < MIN_SAMPLES) return empty;

    const total = logs.length;
    const failures = logs.filter((l) => l.status !== "UP").length;
    const errorRate = failures / total;

    const recentCutoff = Date.now() - RECENT_WINDOW_MS;
    const recentLogs = logs.filter((l) => l.checkedAt.getTime() >= recentCutoff);
    const recentErrorRate =
        recentLogs.length > 0 ? recentLogs.filter((l) => l.status !== "UP").length / recentLogs.length : 0;

    // Response-time regression over UP samples (x = hours since first sample).
    const upSamples = logs.filter(
        (l): l is typeof l & { responseTime: number } => l.status === "UP" && l.responseTime !== null && l.responseTime > 0
    );

    let responseTimeSlope = 0;
    let predictedResponseTimeIn24h: number | null = null;
    let currentResponseTime: number | null = null;
    let responseTimeZScore = 0;

    if (upSamples.length >= 2) {
        const t0 = upSamples[0].checkedAt.getTime();
        const xs = upSamples.map((l) => (l.checkedAt.getTime() - t0) / (60 * 60 * 1000)); // hours
        const ys = upSamples.map((l) => l.responseTime);

        const { slope, intercept } = linearRegression(xs, ys);
        responseTimeSlope = slope;

        const lastX = xs[xs.length - 1];
        predictedResponseTimeIn24h = Math.max(0, Math.round(intercept + slope * (lastX + 24)));
        currentResponseTime = ys[ys.length - 1];

        const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
        const variance = ys.reduce((a, y) => a + Math.pow(y - mean, 2), 0) / ys.length;
        const stddev = Math.sqrt(variance);
        responseTimeZScore = stddev > 0 ? (currentResponseTime - mean) / stddev : 0;
    }

    // SSL days-to-expiry from the most recent log carrying an expiry.
    let sslDaysToExpiry: number | null = null;
    for (let i = logs.length - 1; i >= 0; i--) {
        if (logs[i].sslExpiry) {
            sslDaysToExpiry = Math.floor((logs[i].sslExpiry!.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            break;
        }
    }

    const features: PredictionFeatures = {
        sampleSize: total,
        errorRate,
        recentErrorRate,
        responseTimeSlope,
        responseTimeZScore,
        consecutiveDownCount: endpoint?.consecutiveDownCount ?? 0,
        sslDaysToExpiry,
        incidentsLast7d,
    };

    const { score, factors } = computeRiskScore(features);

    const trend: "improving" | "stable" | "degrading" =
        responseTimeSlope > 5 ? "degrading" : responseTimeSlope < -5 ? "improving" : "stable";

    return {
        hasEnoughData: true,
        riskScore: score,
        riskLevel: levelFromScore(score),
        factors,
        forecast: { currentResponseTime, predictedResponseTimeIn24h, trend },
        features,
    };
}
