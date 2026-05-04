import { describe, it, expect } from "vitest";
import { detectResponseTimeAnomaly } from "@/lib/anomaly-detector";
import type { PrismaClient } from "../../prisma/generated/prisma/client";

function fakePrisma(samples: number[]): PrismaClient {
    return {
        log: {
            findMany: async () =>
                samples.map((rt) => ({ responseTime: rt })),
        },
    } as unknown as PrismaClient;
}

describe("detectResponseTimeAnomaly", () => {
    it("returns no anomaly when current responseTime is null", async () => {
        const result = await detectResponseTimeAnomaly(
            fakePrisma([100, 110, 120]),
            "ep1",
            null
        );
        expect(result.isAnomaly).toBe(false);
        expect(result.baseline).toBeNull();
        expect(result.zScore).toBeNull();
    });

    it("returns no anomaly when sample size is below 20", async () => {
        const samples = Array.from({ length: 10 }, () => 100);
        const result = await detectResponseTimeAnomaly(
            fakePrisma(samples),
            "ep1",
            5000
        );
        expect(result.isAnomaly).toBe(false);
        expect(result.baseline).toBeNull();
    });

    it("computes baseline mean/stddev with sufficient samples", async () => {
        const samples = Array.from({ length: 30 }, () => 100);
        const result = await detectResponseTimeAnomaly(
            fakePrisma(samples),
            "ep1",
            105
        );
        expect(result.baseline).not.toBeNull();
        expect(result.baseline!.mean).toBe(100);
        expect(result.baseline!.stddev).toBe(0);
        expect(result.baseline!.sampleSize).toBe(30);
    });

    it("flags response time > mean + 2*stddev as anomaly", async () => {
        const samples = [
            ...Array.from({ length: 15 }, () => 90),
            ...Array.from({ length: 15 }, () => 110),
        ];
        const result = await detectResponseTimeAnomaly(
            fakePrisma(samples),
            "ep1",
            500 // way above baseline
        );
        expect(result.isAnomaly).toBe(true);
        expect(result.zScore).not.toBeNull();
        expect(result.zScore!).toBeGreaterThan(2);
    });

    it("does NOT flag response time within baseline as anomaly", async () => {
        const samples = [
            ...Array.from({ length: 15 }, () => 90),
            ...Array.from({ length: 15 }, () => 110),
        ];
        const result = await detectResponseTimeAnomaly(
            fakePrisma(samples),
            "ep1",
            105 // well within ±2σ
        );
        expect(result.isAnomaly).toBe(false);
    });

    it("ignores zero or negative responseTime samples", async () => {
        const samples = [
            ...Array.from({ length: 25 }, () => 100),
            0,
            -1,
        ];
        const result = await detectResponseTimeAnomaly(
            fakePrisma(samples),
            "ep1",
            100
        );
        expect(result.baseline?.sampleSize).toBe(25);
    });
});
