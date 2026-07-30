import { describe, it, expect } from "vitest";
import { classifyError, getStatusType, hasContentChanged } from "@/lib/log-script";

describe("getStatusType", () => {
    it("classifies 2xx as UP", () => {
        expect(getStatusType(200)).toBe("UP");
        expect(getStatusType(204)).toBe("UP");
        expect(getStatusType(299)).toBe("UP");
    });

    it("classifies 3xx as REDIRECT", () => {
        expect(getStatusType(301)).toBe("REDIRECT");
        expect(getStatusType(308)).toBe("REDIRECT");
    });

    it("classifies 4xx as CLIENT_ERROR", () => {
        expect(getStatusType(400)).toBe("CLIENT_ERROR");
        expect(getStatusType(404)).toBe("CLIENT_ERROR");
        expect(getStatusType(499)).toBe("CLIENT_ERROR");
    });

    it("classifies 5xx as DOWN", () => {
        expect(getStatusType(500)).toBe("DOWN");
        expect(getStatusType(502)).toBe("DOWN");
        expect(getStatusType(599)).toBe("DOWN");
    });

    it("classifies anything else as UNKNOWN", () => {
        expect(getStatusType(0)).toBe("UNKNOWN");
        expect(getStatusType(100)).toBe("UNKNOWN");
    });
});

describe("classifyError", () => {
    it("returns TIMEOUT for AbortError", () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        expect(classifyError(err)).toBe("TIMEOUT");
    });

    it("returns TIMEOUT for ETIMEDOUT code", () => {
        const err = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
        expect(classifyError(err)).toBe("TIMEOUT");
    });

    it("returns DNS_NOT_FOUND for ENOTFOUND code", () => {
        const err = Object.assign(new Error("dns failed"), { code: "ENOTFOUND" });
        expect(classifyError(err)).toBe("DNS_NOT_FOUND");
    });

    it("returns CONNECTION_REFUSED for ECONNREFUSED code", () => {
        const err = Object.assign(new Error("refused"), { code: "ECONNREFUSED" });
        expect(classifyError(err)).toBe("CONNECTION_REFUSED");
    });

    it("returns CONNECTION_RESET for ECONNRESET code", () => {
        const err = Object.assign(new Error("reset"), { code: "ECONNRESET" });
        expect(classifyError(err)).toBe("CONNECTION_RESET");
    });

    it("returns SSL_ERROR when message contains 'ssl'", () => {
        const err = new Error("SSL handshake failed");
        expect(classifyError(err)).toBe("SSL_ERROR");
    });

    it("returns NETWORK_ERROR as the catch-all", () => {
        const err = new Error("something went wrong");
        expect(classifyError(err)).toBe("NETWORK_ERROR");
    });

    it("handles non-Error inputs gracefully", () => {
        expect(classifyError("string")).toBe("NETWORK_ERROR");
        expect(classifyError(null)).toBe("NETWORK_ERROR");
        expect(classifyError(undefined)).toBe("NETWORK_ERROR");
    });
});

describe("hasContentChanged", () => {
    it("returns true when a prior hash differs from the current one", () => {
        expect(hasContentChanged("abc123", "def456")).toBe(true);
    });

    it("returns false when both hashes are identical", () => {
        expect(hasContentChanged("abc123", "abc123")).toBe(false);
    });

    it("returns false on the first-ever check (no previous hash)", () => {
        expect(hasContentChanged(null, "abc123")).toBe(false);
    });

    it("returns false when the current hash is missing (unreachable)", () => {
        expect(hasContentChanged("abc123", null)).toBe(false);
    });

    it("returns false when both hashes are missing", () => {
        expect(hasContentChanged(null, null)).toBe(false);
    });
});
