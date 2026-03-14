import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const logs = createTRPCRouter({

    getAllLogs: protectedProcedure
        .input(
            z.object({
                page: z.number().int().min(1).default(1),
                limit: z.number().int().min(1).max(100).default(10),

                search: z.string().optional(),

                endpointName: z.string().optional(),
                projectName: z.string().optional(),

                status: z.enum(["UP", "DOWN"]).optional(),
                dnsStatus: z.enum(["RESOLVED", "FAILED"]).optional(),

                startDate: z.date().optional(),
                endDate: z.date().optional(),

                sslValid: z.boolean().optional(),

                sortBy: z.enum(["checkedAt", "responseTime", "httpCode"]).default("checkedAt"),
                sortOrder: z.enum(["asc", "desc"]).default("desc"),
            })
        )
        .query(async ({ ctx, input }) => {
            const { page, limit } = input;
            const skip = (page - 1) * limit;

            const where: any = {
                endpoint: {
                    project: { userId: ctx.session.user.id },
                    isDeleted: false,
                },
            };

            if (input.projectName) {
                where.endpoint.project = {
                    userId: ctx.session.user.id,
                    projectName: {
                        contains: input.projectName,
                        mode: "insensitive",
                    },
                };
            }

            // Filter by status
            if (input.status) {
                where.status = input.status;
            }

            // Filter by DNS status
            if (input.dnsStatus) {
                where.dnsStatus = input.dnsStatus;
            }

            // Filter by SSL
            if (input.sslValid !== undefined) {
                where.sslValid = input.sslValid;
            }

            // Filter by date range
            if (input.startDate || input.endDate) {
                where.checkedAt = {};
                if (input.startDate) where.checkedAt.gte = input.startDate;
                if (input.endDate) where.checkedAt.lte = input.endDate;
            }

            // Sorting
            const orderBy: any = {
                [input.sortBy]: input.sortOrder,
            };

            // Fetch logs and total
            const [logs, total] = await Promise.all([
                ctx.prisma.log.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                    select: {
                        id: true,
                        status: true,
                        httpCode: true,
                        responseTime: true,
                        errorMessage: true,
                        dnsStatus: true,
                        sslValid: true,
                        sslExpiry: true,
                        checkedAt: true,
                        endpoint: {
                            select: {
                                id: true,
                                name: true,
                                url: true,
                                project: {
                                    select: {
                                        id: true,
                                        projectName: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                ctx.prisma.log.count({ where }),
            ]);

            return {
                data: logs,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }),


    getRecentLogs: protectedProcedure
        .input(
            z.object({
                limit: z.number().int().min(1).max(10).default(10),
            })
        )
        .query(async ({ ctx, input }) => {
            const logs = await ctx.prisma.log.findMany({
                where: {
                    endpoint: {
                        project: { userId: ctx.session.user.id },
                    },
                },
                select: {
                    id: true,
                    status: true,
                    httpCode: true,
                    responseTime: true,
                    errorMessage: true,
                    checkedAt: true,
                    dnsStatus: true,
                    sslValid: true,
                    endpoint: {
                        select: {
                            name: true,
                            url: true,
                        },
                    },
                },
                take: input.limit,
                orderBy: {
                    checkedAt: "desc",
                },
            });

            return {
                message: "Recent logs retrieved successfully",
                data: logs,
            };
        }),

    // GET - Get single log by ID with full details
    getLog: protectedProcedure.input(
        z.object({
            logId: z.string().min(1, "Log ID is required"),
        })
    ).query(async ({ ctx, input }) => {
        const log = await ctx.prisma.log.findFirst({
            where: {
                id: input.logId,
                endpoint: {
                    project: { userId: ctx.session.user.id },
                },
            },
            include: {
                endpoint: {
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        checkInterval: true,
                        project: {
                            select: {
                                id: true,
                                projectName: true,
                            },
                        },
                    },
                },
            },
        });

        if (!log) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Log not found",
            });
        }

        return {
            message: "Log retrieved successfully",
            data: log,
        };
    }),

    getIncidents: protectedProcedure.input(
        z.object({
            page: z.number().int().min(1).default(1),
            limit: z.number().int().min(1).max(50).default(10),
            projectId: z.string().optional(),
            endpointId: z.string().optional(),
            status: z.enum(["ongoing", "resolved"]).optional(),
            fromDate: z.string().optional(),
            toDate: z.string().optional(),
            days: z.number().int().min(1).max(365).default(30),
        })
    ).query(async ({ ctx, input }) => {
        const { page, limit } = input;
        const userId = ctx.session.user.id;

        const endpointWhere: any = {
            isDeleted: false,
            project: { userId, isDeleted: false },
        };
        if (input.projectId) endpointWhere.projectId = input.projectId;
        if (input.endpointId) endpointWhere.id = input.endpointId;

        const endpoints = await ctx.prisma.endpoint.findMany({
            where: endpointWhere,
            select: {
                id: true,
                name: true,
                url: true,
                project: { select: { id: true, projectName: true } },
            },
        });

        if (endpoints.length === 0) {
            return { data: [], total: 0, page, totalPages: 0 };
        }

        const endpointIds = endpoints.map((e) => e.id);
        const endpointMap = new Map(endpoints.map((e) => [e.id, e]));

        const since = new Date();
        since.setDate(since.getDate() - input.days);
        since.setHours(0, 0, 0, 0);

        const logs = await ctx.prisma.log.findMany({
            where: {
                endpointId: { in: endpointIds },
                checkedAt: { gte: since },
            },
            select: {
                id: true,
                status: true,
                checkedAt: true,
                errorMessage: true,
                httpCode: true,
                endpointId: true,
            },
            orderBy: [{ endpointId: "asc" }, { checkedAt: "asc" }],
        });

        const logsByEndpoint = new Map<string, typeof logs>();
        for (const log of logs) {
            if (!logsByEndpoint.has(log.endpointId)) logsByEndpoint.set(log.endpointId, []);
            logsByEndpoint.get(log.endpointId)!.push(log);
        }

        const DOWN_STATUSES = ["DOWN", "CLIENT_ERROR", "UNKNOWN"];
        const UP_STATUSES = ["UP", "REDIRECT"];

        type Incident = {
            id: string;
            endpoint: (typeof endpoints)[0];
            startedAt: Date;
            recoveredAt: Date | null;
            durationMs: number;
            status: "ongoing" | "resolved";
            triggerStatus: string;
            httpCode: number | null;
            errorMessage: string | null;
        };

        const incidents: Incident[] = [];

        for (const [endpointId, endpointLogs] of logsByEndpoint) {
            const endpoint = endpointMap.get(endpointId)!;
            let inDowntime = false;
            let incidentStartLog: (typeof logs)[0] | null = null;

            for (const log of endpointLogs) {
                const isDown = DOWN_STATUSES.includes(log.status);
                const isUp = UP_STATUSES.includes(log.status);

                if (!inDowntime && isDown) {
                    inDowntime = true;
                    incidentStartLog = log;
                } else if (inDowntime && isUp) {
                    const durationMs = log.checkedAt.getTime() - incidentStartLog!.checkedAt.getTime();
                    incidents.push({
                        id: incidentStartLog!.id,
                        endpoint,
                        startedAt: incidentStartLog!.checkedAt,
                        recoveredAt: log.checkedAt,
                        durationMs,
                        status: "resolved",
                        triggerStatus: incidentStartLog!.status,
                        httpCode: incidentStartLog!.httpCode,
                        errorMessage: incidentStartLog!.errorMessage,
                    });
                    inDowntime = false;
                    incidentStartLog = null;
                }
            }

            if (inDowntime && incidentStartLog) {
                incidents.push({
                    id: incidentStartLog.id,
                    endpoint,
                    startedAt: incidentStartLog.checkedAt,
                    recoveredAt: null,
                    durationMs: Date.now() - incidentStartLog.checkedAt.getTime(),
                    status: "ongoing",
                    triggerStatus: incidentStartLog.status,
                    httpCode: incidentStartLog.httpCode,
                    errorMessage: incidentStartLog.errorMessage,
                });
            }
        }

        incidents.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

        let filtered = incidents;
        if (input.status) filtered = filtered.filter((i) => i.status === input.status);
        if (input.fromDate) {
            const from = new Date(input.fromDate);
            filtered = filtered.filter((i) => i.startedAt >= from);
        }
        if (input.toDate) {
            const to = new Date(new Date(input.toDate).setHours(23, 59, 59, 999));
            filtered = filtered.filter((i) => i.startedAt <= to);
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const data = filtered.slice(skip, skip + limit).map((i) => ({
            ...i,
            startedAt: i.startedAt.toISOString(),
            recoveredAt: i.recoveredAt?.toISOString() ?? null,
        }));

        const ongoingCount = incidents.filter((i) => i.status === "ongoing").length;
        const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
        const avgDowntimeMs = resolvedCount > 0
            ? Math.round(incidents.filter((i) => i.status === "resolved").reduce((acc, i) => acc + i.durationMs, 0) / resolvedCount)
            : 0;

        return {
            data,
            total,
            page,
            totalPages,
            summary: { total: incidents.length, ongoing: ongoingCount, resolved: resolvedCount, avgDowntimeMs },
        };
    }),

    // DELETE - Bulk delete old logs (cleanup utility)
    cleanupOldLogs: protectedProcedure.input(
        z.object({
            daysToKeep: z.number().int().min(7).max(365).default(90),
            endpointId: z.string().optional(),
        }).optional()
    ).mutation(async ({ ctx, input }) => {
        const daysToKeep = input?.daysToKeep ?? 90;
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

        const whereClause: any = {
            endpoint: { project: { userId: ctx.session.user.id } },
            checkedAt: { lt: cutoffDate },
        };

        if (input?.endpointId) {
            whereClause.endpointId = input.endpointId;
        }

        const deletedLogs = await ctx.prisma.log.deleteMany({
            where: whereClause,
        });

        return {
            message: `Successfully deleted ${deletedLogs.count} old logs`,
            count: deletedLogs.count,
        };
    }),

    // GET - Export logs as CSV data
    exportLogs: protectedProcedure.input(
        z.object({
            endpointId: z.string().optional(),
            projectId: z.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            status: z.enum(["UP", "REDIRECT", "CLIENT_ERROR", "DOWN", "UNKNOWN"]).optional(),
            limit: z.number().int().min(1).max(10000).default(1000),
        }).optional()
    ).query(async ({ ctx, input }) => {
        const whereClause: any = {
            endpoint: { project: { userId: ctx.session.user.id } },
        };

        if (input?.endpointId) {
            whereClause.endpointId = input.endpointId;
        }

        if (input?.projectId) {
            whereClause.endpoint = {
                ...whereClause.endpoint,
                projectId: input.projectId,
            };
        }

        if (input?.status) {
            whereClause.status = input.status;
        }

        if (input?.startDate || input?.endDate) {
            whereClause.checkedAt = {};
            if (input.startDate) {
                whereClause.checkedAt.gte = input.startDate;
            }
            if (input.endDate) {
                whereClause.checkedAt.lte = input.endDate;
            }
        }

        const logs = await ctx.prisma.log.findMany({
            where: whereClause,
            include: {
                endpoint: {
                    select: {
                        name: true,
                        url: true,
                        project: {
                            select: {
                                projectName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { checkedAt: 'desc' },
            take: input?.limit ?? 1000,
        });

        // Format for CSV export (frontend will handle actual CSV generation)
        const exportData = logs.map(log => ({
            timestamp: log.checkedAt.toISOString(),
            endpoint: log.endpoint?.name ?? "Unknown",
            url: log.endpoint?.url ?? "",
            project: log.endpoint?.project?.projectName ?? "",
            status: log.status,
            httpCode: log.httpCode ?? "",
            responseTime: log.responseTime ?? "",
            dnsStatus: log.dnsStatus,
            sslValid: log.sslValid,
            sslExpiry: log.sslExpiry?.toISOString() ?? "",
            ip: log.ip ?? "",
            errorMessage: log.errorMessage ?? "",
            contentLength: log.contentLength ?? "",
        }));

        return {
            message: `Exported ${exportData.length} logs`,
            data: exportData,
            count: exportData.length,
        };
    }),
});