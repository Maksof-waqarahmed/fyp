import { describe, it, expect } from "vitest";
import {
    linearRegression,
    computeRiskScore,
    type PredictionFeatures,
} from "@/lib/failure-predictor";

const baseFeatures = (over: Partial<PredictionFeatures> = {}): PredictionFeatures => ({
    sampleSize: 100,
    errorRate: 0,
    recentErrorRate: 0,
    responseTimeSlope: 0,
    responseTimeZScore: 0,
    consecutiveDownCount: 0,
    sslDaysToExpiry: null,
    incidentsLast7d: 0,
    ...over,
});

describe("linearRegression", () => {
    it("recovers a perfect positive line", () => {
        const { slope, intercept } = linearRegression([0, 1, 2, 3], [10, 20, 30, 40]);
        expect(slope).toBeCloseTo(10, 5);
        expect(intercept).toBeCloseTo(10, 5);
    });

    it("recovers a negative slope", () => {
        const { slope } = linearRegression([0, 1, 2, 3], [40, 30, 20, 10]);
        expect(slope).toBeCloseTo(-10, 5);
    });

    it("returns zero slope for a flat line", () => {
        const { slope } = linearRegression([0, 1, 2, 3], [25, 25, 25, 25]);
        expect(slope).toBeCloseTo(0, 5);
    });

    it("handles fewer than two points safely", () => {
        expect(linearRegression([], [])).toEqual({ slope: 0, intercept: 0 });
        expect(linearRegression([5], [42])).toEqual({ slope: 0, intercept: 42 });
    });
});

describe("computeRiskScore", () => {
    it("returns 0 with no factors for a perfectly healthy endpoint", () => {
        const { score, factors } = computeRiskScore(baseFeatures());
        expect(score).toBe(0);
        expect(factors).toHaveLength(0);
    });

    it("weights recent failures the most", () => {
        const { score, factors } = computeRiskScore(baseFeatures({ recentErrorRate: 1 }));
        expect(score).toBe(40);
        expect(factors[0].name).toBe("Recent failures");
    });

    it("clamps a fully-broken endpoint to 100", () => {
        const { score } = computeRiskScore(
            baseFeatures({
                recentErrorRate: 1,
                errorRate: 1,
                consecutiveDownCount: 5,
                responseTimeZScore: 6,
                incidentsLast7d: 10,
                responseTimeSlope: 100,
                sslDaysToExpiry: 0,
            })
        );
        expect(score).toBe(100);
    });

    it("credits an approaching SSL expiry", () => {
        const { factors } = computeRiskScore(baseFeatures({ sslDaysToExpiry: 0 }));
        const ssl = factors.find((f) => f.name === "SSL expiry approaching");
        expect(ssl).toBeDefined();
        expect(ssl!.points).toBe(10);
    });

    it("does not credit SSL when expiry is comfortably far", () => {
        const { factors } = computeRiskScore(baseFeatures({ sslDaysToExpiry: 90 }));
        expect(factors.find((f) => f.name === "SSL expiry approaching")).toBeUndefined();
    });

    it("sorts factors by contribution descending", () => {
        const { factors } = computeRiskScore(
            baseFeatures({ recentErrorRate: 0.5, incidentsLast7d: 1 })
        );
        for (let i = 1; i < factors.length; i++) {
            expect(factors[i - 1].points).toBeGreaterThanOrEqual(factors[i].points);
        }
    });
});
