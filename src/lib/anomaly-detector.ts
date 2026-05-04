import { PrismaClient } from "../../prisma/generated/prisma/client";

export type Baseline = {
    mean: number;
    stddev: number;
    sampleSize: number;
};

export type AnomalyResult = {
    isAnomaly: boolean;
    baseline: Baseline | null;
    zScore: number | null;
};

const MIN_SAMPLES = 20;
const Z_SCORE_THRESHOLD = 2;
const BASELINE_DAYS = 7;

export async function detectResponseTimeAnomaly(
    prisma: PrismaClient,
    endpointId: string,
    currentResponseTime: number | null
): Promise<AnomalyResult> {
    if (currentResponseTime === null || currentResponseTime <= 0) {
        return { isAnomaly: false, baseline: null, zScore: null };
    }

    const since = new Date();
    since.setDate(since.getDate() - BASELINE_DAYS);

    const logs = await prisma.log.findMany({
        where: {
            endpointId,
            checkedAt: { gte: since },
            status: "UP",
            responseTime: { not: null, gt: 0 },
        },
        select: { responseTime: true },
    });

    const samples = logs
        .map((l) => l.responseTime)
        .filter((t): t is number => t !== null && t > 0);

    if (samples.length < MIN_SAMPLES) {
        return { isAnomaly: false, baseline: null, zScore: null };
    }

    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
        samples.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / samples.length;
    const stddev = Math.sqrt(variance);

    const zScore = stddev > 0 ? (currentResponseTime - mean) / stddev : 0;
    const isAnomaly = zScore > Z_SCORE_THRESHOLD;

    return {
        isAnomaly,
        baseline: {
            mean: Math.round(mean),
            stddev: Math.round(stddev),
            sampleSize: samples.length,
        },
        zScore: Number(zScore.toFixed(2)),
    };
}
