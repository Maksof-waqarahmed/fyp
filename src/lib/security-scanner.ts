import tls from "tls";
import dns from "dns/promises";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type Finding = {
    id: string;
    title: string;
    severity: Severity;
    passed: boolean;
    detail: string;
    recommendation?: string;
};

export type CategoryResult = {
    category: string;
    findings: Finding[];
};

export type SecurityScanResult = {
    score: number; // 0-100
    grade: string; // A-F
    headers: CategoryResult;
    tls: CategoryResult;
    exposedFiles: CategoryResult;
    cookies: CategoryResult;
    httpsRedirect: CategoryResult;
    dnsEmail: CategoryResult;
    techStack: CategoryResult;
};

// How much each FAILED finding deducts from the 100-point baseline.
const SEVERITY_PENALTY: Record<Severity, number> = {
    CRITICAL: 40,
    HIGH: 20,
    MEDIUM: 10,
    LOW: 5,
    INFO: 0,
};

// ────────────────────────────────────────────────────────────────────────
// Pure analyzers (unit-tested — no I/O)
// ────────────────────────────────────────────────────────────────────────

const SECURITY_HEADERS: { name: string; severity: Severity; recommendation: string }[] = [
    {
        name: "strict-transport-security",
        severity: "HIGH",
        recommendation: "Add HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains`",
    },
    {
        name: "content-security-policy",
        severity: "HIGH",
        recommendation: "Define a Content-Security-Policy to mitigate XSS and data-injection attacks",
    },
    {
        name: "x-frame-options",
        severity: "MEDIUM",
        recommendation: "Add `X-Frame-Options: DENY` (or SAMEORIGIN) to prevent clickjacking",
    },
    {
        name: "x-content-type-options",
        severity: "MEDIUM",
        recommendation: "Add `X-Content-Type-Options: nosniff` to stop MIME sniffing",
    },
    {
        name: "referrer-policy",
        severity: "LOW",
        recommendation: "Add `Referrer-Policy: strict-origin-when-cross-origin`",
    },
    {
        name: "permissions-policy",
        severity: "LOW",
        recommendation: "Add a `Permissions-Policy` to restrict powerful browser features",
    },
];

// headers: lowercase-keyed map of the response headers
export function scanSecurityHeaders(headers: Record<string, string>): CategoryResult {
    const findings: Finding[] = SECURITY_HEADERS.map((h) => {
        const present = typeof headers[h.name] === "string" && headers[h.name].length > 0;
        return {
            id: `header:${h.name}`,
            title: h.name
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join("-"),
            severity: h.severity,
            passed: present,
            detail: present ? `Present: ${headers[h.name].slice(0, 120)}` : "Header missing",
            recommendation: present ? undefined : h.recommendation,
        };
    });
    return { category: "Security Headers", findings };
}

// setCookies: raw Set-Cookie header values
export function scanCookies(setCookies: string[]): CategoryResult {
    const findings: Finding[] = [];

    if (setCookies.length === 0) {
        findings.push({
            id: "cookie:none",
            title: "No cookies set",
            severity: "INFO",
            passed: true,
            detail: "The response set no cookies — nothing to harden.",
        });
        return { category: "Cookie Security", findings };
    }

    setCookies.forEach((raw, i) => {
        const lower = raw.toLowerCase();
        const name = raw.split("=")[0]?.trim() || `cookie#${i + 1}`;
        const hasSecure = lower.includes("secure");
        const hasHttpOnly = lower.includes("httponly");
        const hasSameSite = lower.includes("samesite");

        findings.push({
            id: `cookie:${name}:secure`,
            title: `${name} — Secure flag`,
            severity: "MEDIUM",
            passed: hasSecure,
            detail: hasSecure ? "Secure flag set" : "Missing Secure flag (cookie can travel over HTTP)",
            recommendation: hasSecure ? undefined : "Add the `Secure` attribute so the cookie is HTTPS-only",
        });
        findings.push({
            id: `cookie:${name}:httponly`,
            title: `${name} — HttpOnly flag`,
            severity: "MEDIUM",
            passed: hasHttpOnly,
            detail: hasHttpOnly ? "HttpOnly flag set" : "Missing HttpOnly (readable by JavaScript → XSS theft risk)",
            recommendation: hasHttpOnly ? undefined : "Add the `HttpOnly` attribute to block JS access",
        });
        findings.push({
            id: `cookie:${name}:samesite`,
            title: `${name} — SameSite flag`,
            severity: "LOW",
            passed: hasSameSite,
            detail: hasSameSite ? "SameSite attribute set" : "Missing SameSite (CSRF risk)",
            recommendation: hasSameSite ? undefined : "Add `SameSite=Lax` (or Strict) to reduce CSRF exposure",
        });
    });

    return { category: "Cookie Security", findings };
}

export type TlsInfo = {
    reachable: boolean;
    protocol: string | null; // e.g. "TLSv1.2"
    authorized: boolean;
    authorizationError: string | null;
    validTo: string | null;
    issuer: string | null;
};

export function analyzeTls(info: TlsInfo): CategoryResult {
    const findings: Finding[] = [];

    if (!info.reachable) {
        findings.push({
            id: "tls:unreachable",
            title: "TLS handshake",
            severity: "HIGH",
            passed: false,
            detail: "Could not establish a TLS connection on port 443.",
            recommendation: "Ensure the host serves HTTPS with a valid certificate on port 443.",
        });
        return { category: "TLS / SSL", findings };
    }

    const deprecated = info.protocol === "TLSv1" || info.protocol === "TLSv1.1";
    findings.push({
        id: "tls:protocol",
        title: "TLS protocol version",
        severity: "HIGH",
        passed: !deprecated,
        detail: `Negotiated ${info.protocol ?? "unknown"}`,
        recommendation: deprecated ? "Disable TLS 1.0/1.1; require TLS 1.2 or 1.3" : undefined,
    });

    findings.push({
        id: "tls:trust",
        title: "Certificate trust chain",
        severity: "HIGH",
        passed: info.authorized,
        detail: info.authorized
            ? `Trusted certificate${info.issuer ? ` (issuer: ${info.issuer})` : ""}`
            : `Untrusted: ${info.authorizationError ?? "verification failed"}`,
        recommendation: info.authorized
            ? undefined
            : "Install a certificate from a trusted CA (a self-signed / mismatched cert breaks trust)",
    });

    return { category: "TLS / SSL", findings };
}

export type ExposedFileProbe = { path: string; status: number; isHtml: boolean };

export function analyzeExposedFiles(probes: ExposedFileProbe[]): CategoryResult {
    const findings: Finding[] = probes.map((p) => {
        // A path is only treated as "exposed" when it returns 200 AND the body is
        // not HTML — SPA catch-all routes return 200 + index.html for any path,
        // which would otherwise flood us with false positives.
        const exposed = p.status === 200 && !p.isHtml;
        return {
            id: `exposed:${p.path}`,
            title: `Sensitive path ${p.path}`,
            severity: "CRITICAL",
            passed: !exposed,
            detail: exposed
                ? `Reachable (HTTP 200, non-HTML body) — likely leaking sensitive data`
                : `Not exposed (HTTP ${p.status})`,
            recommendation: exposed
                ? `Block public access to ${p.path} at the web server / deny-list this path`
                : undefined,
        };
    });
    return { category: "Exposed Files", findings };
}

export type RedirectInfo = {
    checked: boolean;
    redirectsToHttps: boolean;
    hstsPresent: boolean;
};

export function analyzeHttpsRedirect(info: RedirectInfo): CategoryResult {
    const findings: Finding[] = [];

    if (!info.checked) {
        findings.push({
            id: "redirect:skipped",
            title: "HTTP → HTTPS redirect",
            severity: "INFO",
            passed: true,
            detail: "Plain-HTTP probe could not be performed.",
        });
        return { category: "HTTPS Enforcement", findings };
    }

    findings.push({
        id: "redirect:https",
        title: "HTTP → HTTPS redirect",
        severity: "HIGH",
        passed: info.redirectsToHttps,
        detail: info.redirectsToHttps
            ? "Plain HTTP is redirected to HTTPS"
            : "Plain HTTP is served without redirecting to HTTPS",
        recommendation: info.redirectsToHttps ? undefined : "301-redirect all HTTP traffic to HTTPS",
    });

    findings.push({
        id: "redirect:hsts",
        title: "HSTS enforced",
        severity: "MEDIUM",
        passed: info.hstsPresent,
        detail: info.hstsPresent ? "Strict-Transport-Security header present" : "No HSTS header",
        recommendation: info.hstsPresent ? undefined : "Add HSTS so browsers refuse plain-HTTP downgrade",
    });

    return { category: "HTTPS Enforcement", findings };
}

export type DnsEmailRecords = {
    spf: boolean;
    dmarc: boolean;
    caa: boolean;
};

export function analyzeDnsEmail(records: DnsEmailRecords): CategoryResult {
    const findings: Finding[] = [
        {
            id: "dns:spf",
            title: "SPF record",
            severity: "MEDIUM",
            passed: records.spf,
            detail: records.spf ? "SPF (v=spf1) TXT record found" : "No SPF record — domain can be spoofed in email",
            recommendation: records.spf ? undefined : "Publish an SPF TXT record listing authorized mail senders",
        },
        {
            id: "dns:dmarc",
            title: "DMARC record",
            severity: "MEDIUM",
            passed: records.dmarc,
            detail: records.dmarc ? "DMARC policy found at _dmarc" : "No DMARC policy — spoofed mail is not rejected",
            recommendation: records.dmarc ? undefined : "Publish a DMARC record (start with p=none, then tighten)",
        },
        {
            id: "dns:caa",
            title: "CAA record",
            severity: "LOW",
            passed: records.caa,
            detail: records.caa ? "CAA record restricts which CAs may issue certs" : "No CAA record",
            recommendation: records.caa ? undefined : "Add a CAA record to limit certificate issuance to trusted CAs",
        },
    ];
    return { category: "DNS / Email Security", findings };
}

export function fingerprintTech(headers: Record<string, string>): CategoryResult {
    const findings: Finding[] = [];
    const server = headers["server"] ?? "";
    const poweredBy = headers["x-powered-by"] ?? "";

    if (poweredBy) {
        findings.push({
            id: "tech:x-powered-by",
            title: "Technology disclosure (X-Powered-By)",
            severity: "LOW",
            passed: false,
            detail: `Leaks stack: ${poweredBy}`,
            recommendation: "Remove/spoof the `X-Powered-By` header to avoid handing attackers version intel",
        });
    }

    // Naive EOL heuristic for the most common leak — PHP < 8.0 is end-of-life.
    const phpMatch = /php\/(\d+)\.(\d+)/i.exec(`${server} ${poweredBy}`);
    if (phpMatch) {
        const major = Number(phpMatch[1]);
        const eol = major < 8;
        findings.push({
            id: "tech:php-version",
            title: "PHP version",
            severity: "HIGH",
            passed: !eol,
            detail: `Detected PHP ${phpMatch[1]}.${phpMatch[2]}${eol ? " (end-of-life, unpatched)" : ""}`,
            recommendation: eol ? "Upgrade to a supported PHP 8.x release receiving security patches" : undefined,
        });
    }

    if (findings.length === 0) {
        findings.push({
            id: "tech:clean",
            title: "No obvious tech disclosure",
            severity: "INFO",
            passed: true,
            detail: server ? `Server header: ${server}` : "No version-revealing headers detected",
        });
    }

    return { category: "Tech Fingerprint", findings };
}

// ────────────────────────────────────────────────────────────────────────
// Scoring (pure)
// ────────────────────────────────────────────────────────────────────────

export function gradeFromScore(score: number): string {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
}

export function computeScore(categories: CategoryResult[]): { score: number; grade: string } {
    let penalty = 0;
    for (const cat of categories) {
        for (const f of cat.findings) {
            if (!f.passed) penalty += SEVERITY_PENALTY[f.severity];
        }
    }
    const score = Math.max(0, Math.min(100, 100 - penalty));
    return { score, grade: gradeFromScore(score) };
}

// ────────────────────────────────────────────────────────────────────────
// Network probes (I/O — not unit-tested)
// ────────────────────────────────────────────────────────────────────────

const SENSITIVE_PATHS = [
    "/.env",
    "/.git/config",
    "/.git/HEAD",
    "/wp-config.php.bak",
    "/phpinfo.php",
    "/.aws/credentials",
    "/backup.zip",
    "/config.json",
    "/.DS_Store",
];

function normalizeHeaders(h: Headers): Record<string, string> {
    const out: Record<string, string> = {};
    h.forEach((value, key) => {
        out[key.toLowerCase()] = value;
    });
    return out;
}

async function probeTls(hostname: string): Promise<TlsInfo> {
    return new Promise<TlsInfo>((resolve) => {
        let settled = false;
        const done = (info: TlsInfo) => {
            if (settled) return;
            settled = true;
            resolve(info);
        };
        try {
            const socket = tls.connect(
                443,
                hostname,
                { servername: hostname, rejectUnauthorized: false, timeout: 8000 },
                () => {
                    const cert = socket.getPeerCertificate();
                    const protocol = socket.getProtocol();
                    const authError = (socket as unknown as { authorizationError?: Error | string }).authorizationError;
                    done({
                        reachable: true,
                        protocol,
                        authorized: socket.authorized,
                        authorizationError: authError ? String(authError) : null,
                        validTo: cert?.valid_to ?? null,
                        issuer: cert?.issuer?.O ?? cert?.issuer?.CN ?? null,
                    });
                    socket.end();
                }
            );
            socket.on("error", () =>
                done({ reachable: false, protocol: null, authorized: false, authorizationError: null, validTo: null, issuer: null })
            );
            socket.on("timeout", () => {
                socket.destroy();
                done({ reachable: false, protocol: null, authorized: false, authorizationError: null, validTo: null, issuer: null });
            });
        } catch {
            done({ reachable: false, protocol: null, authorized: false, authorizationError: null, validTo: null, issuer: null });
        }
    });
}

async function probeExposedFiles(origin: string): Promise<ExposedFileProbe[]> {
    return Promise.all(
        SENSITIVE_PATHS.map(async (path) => {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(origin + path, { signal: controller.signal, redirect: "manual" });
                clearTimeout(timer);
                const isHtml = (res.headers.get("content-type") ?? "").includes("text/html");
                return { path, status: res.status, isHtml };
            } catch {
                return { path, status: 0, isHtml: false };
            }
        })
    );
}

async function probeHttpsRedirect(hostname: string, responseHeaders: Record<string, string>): Promise<RedirectInfo> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`http://${hostname}`, { signal: controller.signal, redirect: "manual" });
        clearTimeout(timer);
        const location = res.headers.get("location") ?? "";
        const redirectsToHttps =
            (res.status >= 300 && res.status < 400 && location.startsWith("https://")) ||
            // Some hosts serve HTTPS-only and refuse plain HTTP entirely.
            res.status === 0;
        return {
            checked: true,
            redirectsToHttps,
            hstsPresent: typeof responseHeaders["strict-transport-security"] === "string",
        };
    } catch {
        return {
            checked: true,
            redirectsToHttps: false,
            hstsPresent: typeof responseHeaders["strict-transport-security"] === "string",
        };
    }
}

function baseDomain(hostname: string): string {
    const parts = hostname.split(".");
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join(".");
}

async function probeDnsEmail(hostname: string): Promise<DnsEmailRecords> {
    const domain = baseDomain(hostname);

    const spf = await dns
        .resolveTxt(domain)
        .then((records) => records.some((chunks) => chunks.join("").toLowerCase().includes("v=spf1")))
        .catch(() => false);

    const dmarc = await dns
        .resolveTxt(`_dmarc.${domain}`)
        .then((records) => records.some((chunks) => chunks.join("").toLowerCase().includes("v=dmarc1")))
        .catch(() => false);

    const caa = await dns
        .resolveCaa(domain)
        .then((records) => Array.isArray(records) && records.length > 0)
        .catch(() => false);

    return { spf, dmarc, caa };
}

// ────────────────────────────────────────────────────────────────────────
// Orchestrator — runs every check, returns the full scored result
// ────────────────────────────────────────────────────────────────────────

export async function scanEndpointSecurity(url: string): Promise<SecurityScanResult> {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const origin = parsed.origin;

    // Primary request — its headers feed the header/cookie/tech/redirect checks.
    let responseHeaders: Record<string, string> = {};
    let setCookies: string[] = [];
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        responseHeaders = normalizeHeaders(res.headers);
        // getSetCookie() returns all Set-Cookie values (Node 18.14+/undici)
        const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] };
        setCookies = typeof anyHeaders.getSetCookie === "function" ? anyHeaders.getSetCookie() : [];
    } catch {
        // leave headers empty — analyzers will flag everything as missing
    }

    const [tlsInfo, exposedProbes, redirectInfo, dnsRecords] = await Promise.all([
        probeTls(hostname),
        probeExposedFiles(origin),
        probeHttpsRedirect(hostname, responseHeaders),
        probeDnsEmail(hostname),
    ]);

    const headers = scanSecurityHeaders(responseHeaders);
    const tlsCat = analyzeTls(tlsInfo);
    const exposedFiles = analyzeExposedFiles(exposedProbes);
    const cookies = scanCookies(setCookies);
    const httpsRedirect = analyzeHttpsRedirect(redirectInfo);
    const dnsEmail = analyzeDnsEmail(dnsRecords);
    const techStack = fingerprintTech(responseHeaders);

    const { score, grade } = computeScore([
        headers,
        tlsCat,
        exposedFiles,
        cookies,
        httpsRedirect,
        dnsEmail,
        techStack,
    ]);

    return { score, grade, headers, tls: tlsCat, exposedFiles, cookies, httpsRedirect, dnsEmail, techStack };
}
