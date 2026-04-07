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
                limit: z.number().int().min(1).max(15).default(15),
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

    // GET - Get all endpoints with their incident counts
    getEndpointsWithIncidents: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        // Get all endpoints for user
        const endpoints = await ctx.prisma.endpoint.findMany({
            where: {
                isDeleted: false,
                project: { userId, isDeleted: false },
            },
            select: {
                id: true,
                name: true,
                url: true,
                lastStatus: true,
                project: { select: { projectName: true } },
            },
        });

        // Get incident counts for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const DOWN_STATUSES = ["DOWN", "CLIENT_ERROR", "UNKNOWN"];

        const endpointsWithIncidents = await Promise.all(
            endpoints.map(async (endpoint) => {
                // Get all logs for this endpoint in last 30 days
                const logs = await ctx.prisma.log.findMany({
                    where: {
                        endpointId: endpoint.id,
                        checkedAt: { gte: thirtyDaysAgo },
                    },
                    select: {
                        status: true,
                        checkedAt: true,
                    },
                    orderBy: { checkedAt: "asc" },
                });

                // Count incidents (consecutive DOWN logs count as 1 incident)
                let incidentCount = 0;
                let ongoingCount = 0;
                let lastIncidentAt: Date | null = null;
                let inDowntime = false;

                for (const log of logs) {
                    const isDown = DOWN_STATUSES.includes(log.status);

                    if (!inDowntime && isDown) {
                        inDowntime = true;
                        incidentCount++;
                        lastIncidentAt = log.checkedAt;
                    } else if (inDowntime && !isDown) {
                        inDowntime = false;
                    }
                }

                // If still in downtime, it's ongoing
                if (inDowntime) {
                    ongoingCount = 1;
                }

                return {
                    ...endpoint,
                    incidentCount,
                    ongoingCount,
                    lastIncidentAt: lastIncidentAt?.toISOString() ?? null,
                };
            })
        );

        // Calculate summary
        const totalIncidents = endpointsWithIncidents.reduce((sum, ep) => sum + ep.incidentCount, 0);
        const ongoingIncidents = endpointsWithIncidents.reduce((sum, ep) => sum + ep.ongoingCount, 0);

        return {
            endpoints: endpointsWithIncidents,
            summary: {
                totalEndpoints: endpoints.length,
                totalIncidents,
                ongoingIncidents,
                resolvedIncidents: totalIncidents - ongoingIncidents,
            },
        };
    }),

    // GET - Get detailed incident info for specific endpoint
    getEndpointIncidentDetail: protectedProcedure
        .input(z.object({ endpointId: z.string() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Get endpoint info
            const endpoint = await ctx.prisma.endpoint.findFirst({
                where: {
                    id: input.endpointId,
                    isDeleted: false,
                    project: { userId, isDeleted: false },
                },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    lastStatus: true,
                    project: { select: { projectName: true } },
                },
            });

            if (!endpoint) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Endpoint not found",
                });
            }

            // Get recent logs (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const logs = await ctx.prisma.log.findMany({
                where: {
                    endpointId: input.endpointId,
                    checkedAt: { gte: thirtyDaysAgo },
                },
                select: {
                    id: true,
                    status: true,
                    httpCode: true,
                    errorMessage: true,
                    checkedAt: true,
                    responseTime: true,
                    dnsStatus: true,
                    ip: true,
                    sslValid: true,
                },
                orderBy: { checkedAt: "desc" },
                take: 50,
            });

            // Find current incident (if ongoing)
            const DOWN_STATUSES = ["DOWN", "CLIENT_ERROR", "UNKNOWN"];
            let currentIncident = null;

            if (logs.length > 0 && DOWN_STATUSES.includes(logs[0].status)) {
                // Find when this incident started
                let startLog = logs[0];
                for (let i = 0; i < logs.length; i++) {
                    if (DOWN_STATUSES.includes(logs[i].status)) {
                        startLog = logs[i];
                    } else {
                        break;
                    }
                }

                currentIncident = {
                    status: "ongoing",
                    startedAt: startLog.checkedAt.toISOString(),
                    recoveredAt: null,
                    errorMessage: logs[0].errorMessage,
                    httpCode: logs[0].httpCode,
                    triggerStatus: logs[0].status,
                };
            } else if (logs.length > 0) {
                // Find most recent resolved incident
                const incidentLogs: typeof logs = [];
                for (let i = 0; i < logs.length; i++) {
                    if (DOWN_STATUSES.includes(logs[i].status)) {
                        incidentLogs.push(logs[i]);
                    } else if (incidentLogs.length > 0) {
                        // Found recovery
                        currentIncident = {
                            status: "resolved",
                            startedAt: incidentLogs[incidentLogs.length - 1].checkedAt.toISOString(),
                            recoveredAt: logs[i].checkedAt.toISOString(),
                            errorMessage: incidentLogs[0].errorMessage,
                            httpCode: incidentLogs[0].httpCode,
                            triggerStatus: incidentLogs[0].status,
                        };
                        break;
                    }
                }
            }

            // Format activity log
            const activityLog = logs.map((log) => ({
                id: log.id,
                status: log.status,
                httpCode: log.httpCode,
                errorMessage: log.errorMessage,
                checkedAt: log.checkedAt.toISOString(),
                responseTime: log.responseTime,
                dnsStatus: log.dnsStatus,
                ip: log.ip,
                sslValid: log.sslValid,
            }));

            return {
                endpoint,
                currentIncident,
                activityLog,
            };
        }),

    // GET - Get all incidents in table format (for main incidents page)
    getAllIncidentsTable: protectedProcedure
        .input(
            z.object({
                page: z.number().int().min(1).default(1),
                limit: z.number().int().min(1).max(50).default(10),
                status: z.enum(["ongoing", "resolved"]).optional(),
                search: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { page, limit } = input;
            const userId = ctx.session.user.id;

            // Get all user's endpoints
            const endpoints = await ctx.prisma.endpoint.findMany({
                where: {
                    isDeleted: false,
                    project: { userId, isDeleted: false },
                },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    project: { select: { projectName: true } },
                },
            });

            if (endpoints.length === 0) {
                return {
                    incidents: [],
                    total: 0,
                    page,
                    totalPages: 0,
                    summary: { total: 0, ongoing: 0, resolved: 0, avgDowntimeMs: 0 },
                };
            }

            // Get logs from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const endpointIds = endpoints.map((e) => e.id);
            const endpointMap = new Map(endpoints.map((e) => [e.id, e]));

            const logs = await ctx.prisma.log.findMany({
                where: {
                    endpointId: { in: endpointIds },
                    checkedAt: { gte: thirtyDaysAgo },
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

            const DOWN_STATUSES = ["DOWN", "CLIENT_ERROR", "UNKNOWN"];
            const UP_STATUSES = ["UP", "REDIRECT"];

            type IncidentType = {
                id: string;
                endpointId: string;
                endpointName: string;
                endpointUrl: string;
                projectName: string;
                status: "ongoing" | "resolved";
                rootCause: string | null;
                startedAt: string;
                resolvedAt: string | null;
                durationMs: number;
                httpCode: number | null;
            };

            const incidents: IncidentType[] = [];
            const logsByEndpoint = new Map<string, typeof logs>();

            for (const log of logs) {
                if (!logsByEndpoint.has(log.endpointId)) {
                    logsByEndpoint.set(log.endpointId, []);
                }
                logsByEndpoint.get(log.endpointId)!.push(log);
            }

            // Build incidents from logs
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
                            endpointId: endpoint.id,
                            endpointName: endpoint.name,
                            endpointUrl: endpoint.url,
                            projectName: endpoint.project.projectName,
                            status: "resolved",
                            rootCause: incidentStartLog!.errorMessage,
                            startedAt: incidentStartLog!.checkedAt.toISOString(),
                            resolvedAt: log.checkedAt.toISOString(),
                            durationMs,
                            httpCode: incidentStartLog!.httpCode,
                        });
                        inDowntime = false;
                        incidentStartLog = null;
                    }
                }

                // Ongoing incident
                if (inDowntime && incidentStartLog) {
                    incidents.push({
                        id: incidentStartLog.id,
                        endpointId: endpoint.id,
                        endpointName: endpoint.name,
                        endpointUrl: endpoint.url,
                        projectName: endpoint.project.projectName,
                        status: "ongoing",
                        rootCause: incidentStartLog.errorMessage,
                        startedAt: incidentStartLog.checkedAt.toISOString(),
                        resolvedAt: null,
                        durationMs: Date.now() - incidentStartLog.checkedAt.getTime(),
                        httpCode: incidentStartLog.httpCode,
                    });
                }
            }

            // Sort by most recent
            incidents.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

            // Apply filters
            let filtered = incidents;

            if (input.status) {
                filtered = filtered.filter((i) => i.status === input.status);
            }

            if (input.search) {
                const searchLower = input.search.toLowerCase();
                filtered = filtered.filter(
                    (i) =>
                        i.endpointName.toLowerCase().includes(searchLower) ||
                        i.endpointUrl.toLowerCase().includes(searchLower) ||
                        i.projectName.toLowerCase().includes(searchLower) ||
                        i.rootCause?.toLowerCase().includes(searchLower)
                );
            }

            // Calculate summary
            const ongoingCount = incidents.filter((i) => i.status === "ongoing").length;
            const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
            const avgDowntimeMs =
                resolvedCount > 0
                    ? Math.round(
                          incidents
                              .filter((i) => i.status === "resolved")
                              .reduce((acc, i) => acc + i.durationMs, 0) / resolvedCount
                      )
                    : 0;

            // Pagination
            const total = filtered.length;
            const totalPages = Math.ceil(total / limit);
            const skip = (page - 1) * limit;
            const paginatedIncidents = filtered.slice(skip, skip + limit);

            return {
                incidents: paginatedIncidents,
                total,
                page,
                totalPages,
                summary: {
                    total: incidents.length,
                    ongoing: ongoingCount,
                    resolved: resolvedCount,
                    avgDowntimeMs,
                },
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