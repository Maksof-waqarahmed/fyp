import prisma from "@/lib/prisma";
import { scanEndpointSecurity } from "@/lib/security-scanner";

// Each endpoint is auto-scanned at most once per this window.
const SECURITY_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

// Cap per cron tick so a burst of due endpoints can't blow the serverless
// time budget (each scan does ~12 network probes). The 24h gate naturally
// staggers endpoints across ticks, so a small batch still covers everyone.
const SECURITY_SCAN_BATCH = 5;

// Runs security scans for endpoints that haven't been scanned in the last 24h.
// Scan-only — AI triage stays manual (user-triggered) to keep OpenAI cost bounded.
export async function runDueSecurityScans() {
    try {
        const since = new Date(Date.now() - SECURITY_SCAN_INTERVAL_MS);

        const endpoints = await prisma.endpoint.findMany({
            where: {
                isDeleted: false,
                project: { isDeleted: false },
                // No security scan recorded in the last 24h (or never scanned).
                securityScans: { none: { createdAt: { gte: since } } },
            },
            select: { id: true, url: true, name: true },
            take: SECURITY_SCAN_BATCH,
        });

        if (endpoints.length === 0) return;
        console.log(`🛡️ Security scan due for ${endpoints.length} endpoint(s) this tick`);

        for (const ep of endpoints) {
            try {
                const result = await scanEndpointSecurity(ep.url);
                await prisma.securityScan.create({
                    data: {
                        endpointId: ep.id,
                        score: result.score,
                        grade: result.grade,
                        headers: result.headers as unknown as object,
                        tls: result.tls as unknown as object,
                        exposedFiles: result.exposedFiles as unknown as object,
                        cookies: result.cookies as unknown as object,
                        httpsRedirect: result.httpsRedirect as unknown as object,
                        dnsEmail: result.dnsEmail as unknown as object,
                        techStack: result.techStack as unknown as object,
                    },
                });
                console.log(`🛡️ Scanned ${ep.name}: grade ${result.grade} (${result.score}/100)`);
            } catch (err) {
                console.error(`❌ Security scan failed for ${ep.url}:`, err);
            }
        }
    } catch (error) {
        console.error("❌ Critical error running security scans:", error);
    }
}
