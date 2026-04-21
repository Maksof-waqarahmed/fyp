import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const statusPage = createTRPCRouter({

    create: protectedProcedure.input(
        z.object({
            title: z.string().min(2, "Title must be at least 2 characters").trim(),
            slug: z.string()
                .min(2, "Slug must be at least 2 characters")
                .max(60)
                .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
                .trim(),
            description: z.string().optional(),
            projectIds: z.array(z.string()).min(1, "Select at least one project"),
        })
    ).mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;

        const existing = await ctx.prisma.statusPage.findUnique({
            where: { slug: input.slug },
        });
        if (existing) {
            throw new TRPCError({ code: "CONFLICT", message: "This slug is already taken. Choose another." });
        }

        const userProjects = await ctx.prisma.project.findMany({
            where: { id: { in: input.projectIds }, userId, isDeleted: false },
            select: { id: true },
        });
        if (userProjects.length !== input.projectIds.length) {
            throw new TRPCError({ code: "FORBIDDEN", message: "One or more projects do not belong to you." });
        }

        await ctx.prisma.statusPage.create({
            data: {
                title: input.title,
                slug: input.slug,
                description: input.description,
                userId,
                projects: { connect: input.projectIds.map(id => ({ id })) },
            },
        });

        return { message: "Status page created successfully" };
    }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
        const pages = await ctx.prisma.statusPage.findMany({
            where: { userId: ctx.session.user.id },
            include: {
                projects: {
                    where: { isDeleted: false },
                    select: {
                        id: true,
                        projectName: true,
                        _count: { select: { endpoints: { where: { isDeleted: false } } } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return {
            message: "Status pages retrieved successfully",
            data: pages.map(p => ({
                ...p,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            })),
        };
    }),

    delete: protectedProcedure.input(
        z.object({ id: z.string() })
    ).mutation(async ({ ctx, input }) => {
        const page = await ctx.prisma.statusPage.findFirst({
            where: { id: input.id, userId: ctx.session.user.id },
        });
        if (!page) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Status page not found." });
        }
        await ctx.prisma.statusPage.delete({ where: { id: input.id } });
        return { message: "Status page deleted successfully" };
    }),

    // Public — no auth required
    getBySlug: publicProcedure.input(
        z.object({ slug: z.string() })
    ).query(async ({ ctx, input }) => {
        const page = await ctx.prisma.statusPage.findUnique({
            where: { slug: input.slug, isPublic: true },
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

        if (!page) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Status page not found." });
        }

        // For each endpoint compute uptime last 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const endpointIds = page.projects.flatMap(p => p.endpoints.map(e => e.id));

        const logs = await ctx.prisma.log.findMany({
            where: {
                endpointId: { in: endpointIds },
                checkedAt: { gte: ninetyDaysAgo },
            },
            select: { endpointId: true, status: true, checkedAt: true, responseTime: true },
            orderBy: { checkedAt: "asc" },
        });

        // Group logs by endpointId
        const logsByEndpoint: Record<string, typeof logs> = {};
        for (const log of logs) {
            if (!logsByEndpoint[log.endpointId]) logsByEndpoint[log.endpointId] = [];
            logsByEndpoint[log.endpointId]!.push(log);
        }

        // Build 90-day bar data per endpoint
        const today = new Date();
        const days90: string[] = Array.from({ length: 90 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (89 - i));
            return d.toISOString().split("T")[0]!;
        });

        const endpointStats = endpointIds.map(epId => {
            const epLogs = logsByEndpoint[epId] ?? [];

            // Group by date
            const byDate: Record<string, { up: number; total: number }> = {};
            for (const log of epLogs) {
                const date = log.checkedAt.toISOString().split("T")[0]!;
                if (!byDate[date]) byDate[date] = { up: 0, total: 0 };
                byDate[date]!.total += 1;
                if (log.status === "UP") byDate[date]!.up += 1;
            }

            const bars = days90.map(date => {
                const d = byDate[date];
                if (!d || d.total === 0) return "empty" as const;
                return d.up / d.total >= 0.9 ? ("up" as const) : ("down" as const);
            });

            const totalUp = epLogs.filter(l => l.status === "UP").length;
            const totalChecks = epLogs.length;
            const uptime90d = totalChecks > 0
                ? ((totalUp / totalChecks) * 100).toFixed(2)
                : "N/A";

            const responseTimes = epLogs.map(l => l.responseTime).filter((v): v is number => v !== null);
            const avgResponse = responseTimes.length > 0
                ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
                : null;

            return { endpointId: epId, uptime90d, bars, avgResponse };
        });

        return {
            message: "Status page retrieved successfully",
            data: {
                id: page.id,
                title: page.title,
                slug: page.slug,
                description: page.description,
                ownerName: page.user.name,
                createdAt: page.createdAt.toISOString(),
                projects: page.projects.map(p => ({
                    id: p.id,
                    projectName: p.projectName,
                    endpoints: p.endpoints.map(ep => {
                        const stats = endpointStats.find(s => s.endpointId === ep.id);
                        return {
                            id: ep.id,
                            name: ep.name,
                            url: ep.url,
                            lastStatus: ep.lastStatus,
                            lastCheckedAt: ep.lastCheckedAt?.toISOString() ?? null,
                            checkInterval: ep.checkInterval,
                            uptime90d: stats?.uptime90d ?? "N/A",
                            avgResponse: stats?.avgResponse ?? null,
                            bars: stats?.bars ?? days90.map(() => "empty" as const),
                        };
                    }),
                })),
            },
        };
    }),
});
