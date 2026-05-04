import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    signAccessCookie,
    verifyAccessCookie,
} from "@/lib/status-page-cookie";

describe("status-page-cookie HMAC sign/verify", () => {
    const originalSecret = process.env.BETTER_AUTH_SECRET;

    beforeAll(() => {
        process.env.BETTER_AUTH_SECRET = "test-secret-please-do-not-use-in-prod";
    });

    afterAll(() => {
        process.env.BETTER_AUTH_SECRET = originalSecret;
    });

    it("verifies a freshly signed cookie for the correct page", async () => {
        const cookie = await signAccessCookie("page_abc");
        expect(await verifyAccessCookie(cookie, "page_abc")).toBe(true);
    });

    it("rejects a cookie used for a different page id", async () => {
        const cookie = await signAccessCookie("page_abc");
        expect(await verifyAccessCookie(cookie, "page_xyz")).toBe(false);
    });

    it("rejects a tampered signature", async () => {
        const cookie = await signAccessCookie("page_abc");
        const tampered = cookie.slice(0, -2) + (cookie.endsWith("AA") ? "BB" : "AA");
        expect(await verifyAccessCookie(tampered, "page_abc")).toBe(false);
    });

    it("rejects a malformed cookie", async () => {
        expect(await verifyAccessCookie("not.a.valid.cookie.value", "page_abc")).toBe(false);
        expect(await verifyAccessCookie("", "page_abc")).toBe(false);
    });

    it("rejects an expired cookie", async () => {
        const cookie = await signAccessCookie("page_abc", -1000);
        expect(await verifyAccessCookie(cookie, "page_abc")).toBe(false);
    });

    it("rejects when signed with a different secret", async () => {
        const cookie = await signAccessCookie("page_abc");
        process.env.BETTER_AUTH_SECRET = "a-completely-different-secret";
        try {
            expect(await verifyAccessCookie(cookie, "page_abc")).toBe(false);
        } finally {
            process.env.BETTER_AUTH_SECRET = "test-secret-please-do-not-use-in-prod";
        }
    });
});
