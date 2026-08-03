import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { scanEndpointSecurity, type CategoryResult } from "@/lib/security-scanner";
import { analyzeSecurityPosture, type SecurityTriage } from "@/services/openAI";

// Confirms the endpoint belongs to the signed-in user; returns it or throws.
async function assertOwnedEndpoint(
    prisma: any,
    userId: string,
    endpointId: string
): Promise<{ id: string; name: string; url: string }> {
    const endpoint = await prisma.endpoint.findFirst({
        where: { id: endpointId, isDeleted: false, project: { userId, isDeleted: false } },
        select: { id: true, name: true, url: true },
    });
    if (!endpoint) throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });
    return endpoint;
}

export const security = createTRPCRouter({
    // POST — run a fresh scan and persist it. Network I/O only, no AI cost.
    scanNow: protectedProcedure
        .input(z.object({ endpointId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            const endpoint = await assertOwnedEndpoint(ctx.prisma, userId, input.endpointId);

            const result = await scanEndpointSecurity(endpoint.url);

            const scan = await ctx.prisma.securityScan.create({
                data: {
                    endpointId: endpoint.id,
                    score: result.score,
                    grade: result.grade,
                    headers: result.headers as any,
                    tls: result.tls as any,
                    exposedFiles: result.exposedFiles as any,
                    cookies: result.cookies as any,
                    httpsRedirect: result.httpsRedirect as any,
                    dnsEmail: result.dnsEmail as any,
                    techStack: result.techStack as any,
                },
            });

            return { scanId: scan.id, score: scan.score, grade: scan.grade, scannedAt: scan.createdAt.toISOString() };
        }),

    // GET — latest persisted scan for an endpoint (no scan / AI cost).
    getLatestScan: protectedProcedure
        .input(z.object({ endpointId: z.string() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            const endpoint = await assertOwnedEndpoint(ctx.prisma, userId, input.endpointId);

            const scan = await ctx.prisma.securityScan.findFirst({
                where: { endpointId: endpoint.id },
                orderBy: { createdAt: "desc" },
            });

            if (!scan) {
                return { endpoint, hasScan: false as const, scan: null };
            }

            return {
                endpoint,
                hasScan: true as const,
                scan: {
                    id: scan.id,
                    score: scan.score,
                    grade: scan.grade,
                    scannedAt: scan.createdAt.toISOString(),
                    headers: scan.headers as unknown as CategoryResult,
                    tls: scan.tls as unknown as CategoryResult,
                    exposedFiles: scan.exposedFiles as unknown as CategoryResult,
                    cookies: scan.cookies as unknown as CategoryResult,
                    httpsRedirect: scan.httpsRedirect as unknown as CategoryResult,
                    dnsEmail: scan.dnsEmail as unknown as CategoryResult,
                    techStack: scan.techStack as unknown as CategoryResult,
                    aiTriage: (scan.aiTriage as unknown as SecurityTriage | null) ?? null,
                    aiTriagedAt: scan.aiTriagedAt?.toISOString() ?? null,
                },
            };
        }),

    // GET — score trend for the sparkline / history chart.
    getScanHistory: protectedProcedure
        .input(z.object({ endpointId: z.string(), limit: z.number().int().min(1).max(90).default(30) }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            const endpoint = await assertOwnedEndpoint(ctx.prisma, userId, input.endpointId);

            const scans = await ctx.prisma.securityScan.findMany({
                where: { endpointId: endpoint.id },
                orderBy: { createdAt: "desc" },
                take: input.limit,
                select: { id: true, score: true, grade: true, createdAt: true },
            });

            return scans
                .reverse()
                .map((s) => ({ id: s.id, score: s.score, grade: s.grade, scannedAt: s.createdAt.toISOString() }));
        }),

    // POST — AI triage on the latest scan. Costs an OpenAI call + rate-limit slot.
    runAiTriage: protectedProcedure
        .input(z.object({ endpointId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            const endpoint = await assertOwnedEndpoint(ctx.prisma, userId, input.endpointId);

            const scan = await ctx.prisma.securityScan.findFirst({
                where: { endpointId: endpoint.id },
                orderBy: { createdAt: "desc" },
            });
            if (!scan) throw new TRPCError({ code: "BAD_REQUEST", message: "Run a scan first." });

            const categories: CategoryResult[] = [
                scan.headers as unknown as CategoryResult,
                scan.tls as unknown as CategoryResult,
                scan.exposedFiles as unknown as CategoryResult,
                scan.cookies as unknown as CategoryResult,
                scan.httpsRedirect as unknown as CategoryResult,
                scan.dnsEmail as unknown as CategoryResult,
                scan.techStack as unknown as CategoryResult,
            ];

            const failedFindings = categories.flatMap((c) =>
                c.findings
                    .filter((f) => !f.passed && f.severity !== "INFO")
                    .map((f) => ({ category: c.category, title: f.title, severity: f.severity, detail: f.detail }))
            );

            const triage = await analyzeSecurityPosture(
                { endpoint: { name: endpoint.name, url: endpoint.url }, score: scan.score, grade: scan.grade, failedFindings },
                { scanId: scan.id, userId, prisma: ctx.prisma }
            );

            if (triage) {
                await ctx.prisma.securityScan.update({
                    where: { id: scan.id },
                    data: { aiTriage: triage as any, aiTriagedAt: new Date() },
                });
            }

            return { triage };
        }),

    // GET — endpoints with their latest security grade (for the overview list).
    getAllLatestScans: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        const endpoints = await ctx.prisma.endpoint.findMany({
            where: { isDeleted: false, project: { userId, isDeleted: false } },
            select: {
                id: true,
                name: true,
                url: true,
                project: { select: { projectName: true } },
                securityScans: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { score: true, grade: true, createdAt: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return endpoints.map((e) => {
            const latest = e.securityScans[0] ?? null;
            return {
                id: e.id,
                name: e.name,
                url: e.url,
                projectName: e.project.projectName,
                latestScore: latest?.score ?? null,
                latestGrade: latest?.grade ?? null,
                scannedAt: latest?.createdAt.toISOString() ?? null,
            };
        });
    }),
});
