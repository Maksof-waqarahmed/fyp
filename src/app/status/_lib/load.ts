import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import {
    STATUS_PAGE_ACCESS_COOKIE,
    verifyAccessCookie,
} from "@/lib/status-page-cookie";

export type StatusPageData = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    ownerName: string;
    createdAt: string;
    allUp: boolean;
    totalEndpoints: number;
    upCount: number;
    downCount: number;
    avgUptime: number | null;
    avgResponse: number | null;
    projects: Array<{
        id: string;
        projectName: string;
        endpoints: Array<{
            id: string;
            name: string;
            url: string;
            lastStatus: string | null;
            lastCheckedAt: string | null;
            checkInterval: number;
            uptime90d: number | null;
            avgResponse: number | null;
            bars: Array<"up" | "down" | "empty">;
        }>;
    }>;
};

export type GateOutcome =
    | { kind: "ALLOW"; data: StatusPageData; pageId: string }
    | { kind: "NOT_FOUND" }
    | { kind: "PASSWORD_REQUIRED"; pageId: string; title: string };

type LoadInput = { slug: string } | { embedKey: string };

export async function loadAndGate(input: LoadInput): Promise<GateOutcome> {
    const where = "slug" in input
        ? { slug: input.slug }
        : { embedKey: input.embedKey };

    const page = await prisma.statusPage.findUnique({
        where: where as any,
        include: {
            user: { select: { name: true } },
            projects: {
                where: { isDeleted: false },
                include: {
                    endpoints: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            name: true,
                            url: true,
                            lastStatus: true,
                            lastCheckedAt: true,
                            checkInterval: true,
                        },
                    },
                },
            },
        },
    });

    if (!page) return { kind: "NOT_FOUND" };

    // ── Visibility gate ──────────────────────────────────────────────────────
    if (page.visibility === "PASSWORD") {
        const cookieStore = await cookies();
        const cookie = cookieStore.get(`${STATUS_PAGE_ACCESS_COOKIE}_${page.id}`)?.value;
        const ok = cookie ? await verifyAccessCookie(cookie, page.id) : false;
        if (!ok) {
            return {
                kind: "PASSWORD_REQUIRED",
                pageId: page.id,
                title: page.title,
            };
        }
    }
    // PUBLIC → fall through

    // ── Compute the heavy view data ──────────────────────────────────────────
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const endpointIds = page.projects.flatMap((p) => p.endpoints.map((e) => e.id));

    const logs = endpointIds.length > 0
        ? await prisma.log.findMany({
            where: { endpointId: { in: endpointIds }, checkedAt: { gte: ninetyDaysAgo } },
            select: { endpointId: true, status: true, checkedAt: true, responseTime: true },
            orderBy: { checkedAt: "asc" },
        })
        : [];

    const logsByEp: Record<string, typeof logs> = {};
    for (const log of logs) {
        if (!logsByEp[log.endpointId]) logsByEp[log.endpointId] = [];
        logsByEp[log.endpointId]!.push(log);
    }

    const today = new Date();
    const days90 = Array.from({ length: 90 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (89 - i));
        return d.toISOString().split("T")[0]!;
    });

    const projects = page.projects.map((proj) => ({
        id: proj.id,
        projectName: proj.projectName,
        endpoints: proj.endpoints.map((ep) => {
            const epLogs = logsByEp[ep.id] ?? [];
            const byDate: Record<string, { up: number; total: number }> = {};
            for (const log of epLogs) {
                const date = log.checkedAt.toISOString().split("T")[0]!;
                if (!byDate[date]) byDate[date] = { up: 0, total: 0 };
                byDate[date]!.total++;
                if (log.status === "UP") byDate[date]!.up++;
            }

            const bars = days90.map((date) => {
                const d = byDate[date];
                if (!d || d.total === 0) return "empty" as const;
                return d.up / d.total >= 0.9 ? ("up" as const) : ("down" as const);
            });

            const totalUp = epLogs.filter((l) => l.status === "UP").length;
            const totalChecks = epLogs.length;
            const uptime90d = totalChecks > 0 ? (totalUp / totalChecks) * 100 : null;

            const times = epLogs.map((l) => l.responseTime).filter((v): v is number => v !== null);
            const avgResponse = times.length > 0
                ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
                : null;

            return {
                id: ep.id,
                name: ep.name,
                url: ep.url,
                lastStatus: ep.lastStatus as string | null,
                lastCheckedAt: ep.lastCheckedAt?.toISOString() ?? null,
                checkInterval: ep.checkInterval,
                uptime90d,
                avgResponse,
                bars,
            };
        }),
    }));

    const allEndpoints = projects.flatMap((p) => p.endpoints);
    const totalEndpoints = allEndpoints.length;
    const upCount = allEndpoints.filter((e) => e.lastStatus === "UP").length;
    const downCount = allEndpoints.filter((e) => e.lastStatus === "DOWN").length;
    const allUp = downCount === 0 && totalEndpoints > 0;

    const avgUptime = allEndpoints.length > 0
        ? allEndpoints.reduce((sum, e) => sum + (e.uptime90d ?? 100), 0) / allEndpoints.length
        : null;

    const avgResponse = (() => {
        const vals = allEndpoints.map((e) => e.avgResponse).filter((v): v is number => v !== null);
        return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    })();

    const data: StatusPageData = {
        id: page.id,
        title: page.title,
        slug: page.slug,
        description: page.description,
        ownerName: page.user.name,
        createdAt: page.createdAt.toISOString(),
        allUp,
        totalEndpoints,
        upCount,
        downCount,
        avgUptime,
        avgResponse,
        projects,
    };

    return { kind: "ALLOW", data, pageId: page.id };
}
