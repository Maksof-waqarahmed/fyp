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

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
                incidents: {
                    where: { startedAt: { gte: thirtyDaysAgo } },
                    select: {
                        id: true,
                        status: true,
                        startedAt: true,
                    },
                    orderBy: { startedAt: "desc" },
                },
            },
        });

        const endpointsWithIncidents = endpoints.map((endpoint) => {
            const incidentCount = endpoint.incidents.length;
            const ongoingCount = endpoint.incidents.filter((i) => i.status === "ONGOING").length;
            const lastIncidentAt = endpoint.incidents[0]?.startedAt ?? null;

            const { incidents: _omit, ...rest } = endpoint;
            void _omit;

            return {
                ...rest,
                incidentCount,
                ongoingCount,
                lastIncidentAt: lastIncidentAt?.toISOString() ?? null,
            };
        });

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

            // Latest incident from the Incident table — prefer ongoing, fallback to most recent resolved
            const ongoing = await ctx.prisma.incident.findFirst({
                where: { endpointId: input.endpointId, status: "ONGOING" },
                orderBy: { startedAt: "desc" },
            });

            const latestIncident = ongoing
                ? ongoing
                : await ctx.prisma.incident.findFirst({
                      where: { endpointId: input.endpointId },
                      orderBy: { startedAt: "desc" },
                  });

            const currentIncident = latestIncident
                ? {
                      id: latestIncident.id,
                      status: latestIncident.status === "ONGOING" ? "ongoing" : "resolved",
                      startedAt: latestIncident.startedAt.toISOString(),
                      recoveredAt: latestIncident.recoveredAt?.toISOString() ?? null,
                      downtimeMs:
                          latestIncident.status === "ONGOING"
                              ? Date.now() - latestIncident.startedAt.getTime()
                              : latestIncident.downtimeMs,
                      errorMessage: latestIncident.errorMessage,
                      httpCode: latestIncident.httpCode,
                      triggerStatus: latestIncident.triggerStatus,
                  }
                : null;

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

            const baseWhere: any = {
                endpoint: {
                    isDeleted: false,
                    project: { userId, isDeleted: false },
                },
            };

            if (input.status) {
                baseWhere.status = input.status === "ongoing" ? "ONGOING" : "RESOLVED";
            }

            if (input.search) {
                const s = input.search;
                baseWhere.OR = [
                    { endpoint: { ...baseWhere.endpoint, name: { contains: s, mode: "insensitive" } } },
                    { endpoint: { ...baseWhere.endpoint, url: { contains: s, mode: "insensitive" } } },
                    {
                        endpoint: {
                            ...baseWhere.endpoint,
                            project: { ...baseWhere.endpoint.project, projectName: { contains: s, mode: "insensitive" } },
                        },
                    },
                    { errorMessage: { contains: s, mode: "insensitive" } },
                ];
                delete baseWhere.endpoint;
            }

            const [rows, total] = await Promise.all([
                ctx.prisma.incident.findMany({
                    where: baseWhere,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { startedAt: "desc" },
                    select: {
                        id: true,
                        status: true,
                        startedAt: true,
                        recoveredAt: true,
                        downtimeMs: true,
                        errorMessage: true,
                        httpCode: true,
                        endpoint: {
                            select: {
                                id: true,
                                name: true,
                                url: true,
                                project: { select: { projectName: true } },
                            },
                        },
                    },
                }),
                ctx.prisma.incident.count({ where: baseWhere }),
            ]);

            const incidents = rows.map((i) => ({
                id: i.id,
                endpointId: i.endpoint.id,
                endpointName: i.endpoint.name,
                endpointUrl: i.endpoint.url,
                projectName: i.endpoint.project.projectName,
                status: i.status === "ONGOING" ? ("ongoing" as const) : ("resolved" as const),
                rootCause: i.errorMessage,
                startedAt: i.startedAt.toISOString(),
                resolvedAt: i.recoveredAt?.toISOString() ?? null,
                durationMs:
                    i.status === "ONGOING"
                        ? Date.now() - i.startedAt.getTime()
                        : i.downtimeMs,
                httpCode: i.httpCode,
            }));

            // Summary across the user's full incident history (no pagination/filter)
            const summaryWhere = {
                endpoint: {
                    isDeleted: false,
                    project: { userId, isDeleted: false },
                },
            };

            const [summaryTotal, ongoingTotal, resolvedAgg] = await Promise.all([
                ctx.prisma.incident.count({ where: summaryWhere }),
                ctx.prisma.incident.count({ where: { ...summaryWhere, status: "ONGOING" } }),
                ctx.prisma.incident.aggregate({
                    where: { ...summaryWhere, status: "RESOLVED" },
                    _avg: { downtimeMs: true },
                    _count: true,
                }),
            ]);

            return {
                incidents,
                total,
                page,
                totalPages: Math.ceil(total / limit),
                summary: {
                    total: summaryTotal,
                    ongoing: ongoingTotal,
                    resolved: resolvedAgg._count,
                    avgDowntimeMs: Math.round(resolvedAgg._avg.downtimeMs ?? 0),
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