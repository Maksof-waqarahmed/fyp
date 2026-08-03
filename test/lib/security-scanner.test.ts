import { describe, it, expect } from "vitest";
import {
    scanSecurityHeaders,
    scanCookies,
    analyzeTls,
    analyzeExposedFiles,
    analyzeHttpsRedirect,
    analyzeDnsEmail,
    fingerprintTech,
    computeScore,
    gradeFromScore,
    type CategoryResult,
} from "@/lib/security-scanner";

describe("scanSecurityHeaders", () => {
    it("passes every check when all headers are present", () => {
        const headers = {
            "strict-transport-security": "max-age=31536000",
            "content-security-policy": "default-src 'self'",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff",
            "referrer-policy": "no-referrer",
            "permissions-policy": "geolocation=()",
        };
        const result = scanSecurityHeaders(headers);
        expect(result.findings.every((f) => f.passed)).toBe(true);
    });

    it("fails HSTS and CSP when missing", () => {
        const result = scanSecurityHeaders({});
        const hsts = result.findings.find((f) => f.id === "header:strict-transport-security");
        const csp = result.findings.find((f) => f.id === "header:content-security-policy");
        expect(hsts?.passed).toBe(false);
        expect(csp?.passed).toBe(false);
        expect(hsts?.severity).toBe("HIGH");
    });
});

describe("scanCookies", () => {
    it("returns an INFO pass when no cookies are set", () => {
        const result = scanCookies([]);
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].passed).toBe(true);
        expect(result.findings[0].severity).toBe("INFO");
    });

    it("flags a cookie missing Secure/HttpOnly/SameSite", () => {
        const result = scanCookies(["sid=abc123"]);
        expect(result.findings.filter((f) => !f.passed)).toHaveLength(3);
    });

    it("passes a fully-hardened cookie", () => {
        const result = scanCookies(["sid=abc123; Secure; HttpOnly; SameSite=Lax"]);
        expect(result.findings.every((f) => f.passed)).toBe(true);
    });
});

describe("analyzeTls", () => {
    it("flags deprecated TLS versions", () => {
        const result = analyzeTls({
            reachable: true,
            protocol: "TLSv1.1",
            authorized: true,
            authorizationError: null,
            validTo: null,
            issuer: "Test CA",
        });
        const proto = result.findings.find((f) => f.id === "tls:protocol");
        expect(proto?.passed).toBe(false);
    });

    it("passes a trusted TLS 1.3 connection", () => {
        const result = analyzeTls({
            reachable: true,
            protocol: "TLSv1.3",
            authorized: true,
            authorizationError: null,
            validTo: null,
            issuer: "Test CA",
        });
        expect(result.findings.every((f) => f.passed)).toBe(true);
    });

    it("flags an unreachable TLS endpoint", () => {
        const result = analyzeTls({
            reachable: false,
            protocol: null,
            authorized: false,
            authorizationError: null,
            validTo: null,
            issuer: null,
        });
        expect(result.findings[0].passed).toBe(false);
    });
});

describe("analyzeExposedFiles", () => {
    it("flags a 200 non-HTML sensitive path as CRITICAL exposure", () => {
        const result = analyzeExposedFiles([{ path: "/.env", status: 200, isHtml: false }]);
        expect(result.findings[0].passed).toBe(false);
        expect(result.findings[0].severity).toBe("CRITICAL");
    });

    it("does NOT flag a 200 that returns HTML (SPA catch-all)", () => {
        const result = analyzeExposedFiles([{ path: "/.env", status: 200, isHtml: true }]);
        expect(result.findings[0].passed).toBe(true);
    });

    it("treats a 404 as not exposed", () => {
        const result = analyzeExposedFiles([{ path: "/.git/config", status: 404, isHtml: false }]);
        expect(result.findings[0].passed).toBe(true);
    });
});

describe("analyzeHttpsRedirect / analyzeDnsEmail / fingerprintTech", () => {
    it("passes when HTTP redirects to HTTPS with HSTS", () => {
        const result = analyzeHttpsRedirect({ checked: true, redirectsToHttps: true, hstsPresent: true });
        expect(result.findings.every((f) => f.passed)).toBe(true);
    });

    it("flags missing SPF and DMARC", () => {
        const result = analyzeDnsEmail({ spf: false, dmarc: false, caa: true });
        expect(result.findings.find((f) => f.id === "dns:spf")?.passed).toBe(false);
        expect(result.findings.find((f) => f.id === "dns:dmarc")?.passed).toBe(false);
        expect(result.findings.find((f) => f.id === "dns:caa")?.passed).toBe(true);
    });

    it("flags an end-of-life PHP version disclosure", () => {
        const result = fingerprintTech({ "x-powered-by": "PHP/7.2.1" });
        const php = result.findings.find((f) => f.id === "tech:php-version");
        expect(php?.passed).toBe(false);
        expect(php?.severity).toBe("HIGH");
    });
});

describe("computeScore / gradeFromScore", () => {
    it("returns 100 / A for a clean scan", () => {
        const clean: CategoryResult[] = [{ category: "x", findings: [{ id: "a", title: "a", severity: "HIGH", passed: true, detail: "" }] }];
        expect(computeScore(clean)).toEqual({ score: 100, grade: "A" });
    });

    it("deducts by severity and never drops below 0", () => {
        const cats: CategoryResult[] = [
            {
                category: "x",
                findings: [
                    { id: "a", title: "a", severity: "CRITICAL", passed: false, detail: "" },
                    { id: "b", title: "b", severity: "CRITICAL", passed: false, detail: "" },
                    { id: "c", title: "c", severity: "CRITICAL", passed: false, detail: "" },
                ],
            },
        ];
        // 3 x 40 = 120 penalty → clamps to 0
        expect(computeScore(cats).score).toBe(0);
    });

    it("maps score boundaries to grades", () => {
        expect(gradeFromScore(90)).toBe("A");
        expect(gradeFromScore(80)).toBe("B");
        expect(gradeFromScore(70)).toBe("C");
        expect(gradeFromScore(60)).toBe("D");
        expect(gradeFromScore(59)).toBe("F");
    });
});
