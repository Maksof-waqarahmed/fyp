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

            // const abc = await ctx.prisma.log.findMany({
            //     where: {
            //         endpoint: {
            //             userId: ctx.session.user.id,
            //             isDeleted: false,
            //             project: {
            //                 is: {
            //                     projectName: {
            //                         contains: "Waqar",
            //                         mode: "insensitive",
            //                     },
            //                 },
            //             },
            //         },
            //     },
            //     select: {
            //         id: true,
            //         endpoint: {
            //             select: {
            //                 name: true,
            //                 project: {
            //                     select: { projectName: true }
            //                 }
            //             }
            //         }
            //     }
            // });
            // const abc = await ctx.prisma.log.findMany({
            //     where: { endpoint: { userId: ctx.session.user.id, isDeleted: false } },
            //     include: { endpoint: { include: { project: true } } }
            // });
            // console.log(abc);
            // Base where clause

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

            // Global search (endpoint name, project name, error message)
            // if (input.search) {
            //     where.OR = [
            //         {
            //             endpoint: {
            //                 name: {
            //                     contains: input.search,
            //                     mode: "insensitive",
            //                 },
            //             },
            //         },
            //         {
            //             endpoint: {
            //                 project: {
            //                     is: {
            //                         projectName: {
            //                             contains: input.search,
            //                             mode: "insensitive",
            //                         },
            //                     },
            //                 },
            //             },
            //         },
            //         {
            //             errorMessage: {
            //                 contains: input.search,
            //                 mode: "insensitive",
            //             },
            //         },
            //     ];
            // }

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
                limit: z.number().int().min(1).max(5).default(5),
            })
        )
        .query(async ({ ctx, input }) => {
            try {
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
            } catch (error: unknown) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message:
                        error instanceof Error ? error.message : "Unknown error",
                });
            }
        }),

    // GET - Get single log by ID with full details
    getLog: protectedProcedure.input(
        z.object({
            logId: z.string().min(1, "Log ID is required"),
        })
    ).query(async ({ ctx, input }) => {
        try {
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
        } catch (error: unknown) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }),

    // GET - Get logs for specific endpoint with timeline
    // getEndpointLogs: protectedProcedure.input(
    //     z.object({
    //         endpointId: z.string().min(1, "Endpoint ID is required"),
    //         page: z.number().int().min(1).default(1),
    //         limit: z.number().int().min(1).max(100).default(20),
    //         hours: z.number().int().min(1).max(168).optional().default(24),
    //     }).optional()
    // ).query(async ({ ctx, input }) => {
    //     const endpointId = input?.endpointId;
    //     if (!endpointId) {
    //         throw new TRPCError({
    //             code: "BAD_REQUEST",
    //             message: "Endpoint ID is required",
    //         });
    //     }

    //     const page = input?.page ?? 1;
    //     const limit = input?.limit ?? 20;
    //     const hours = input?.hours ?? 24;
    //     const skip = (page - 1) * limit;

    //     try {
    //         // Verify endpoint belongs to user
    //         const endpoint = await ctx.prisma.endpoint.findFirst({
    //             where: {
    //                 id: endpointId,
    //                 userId: ctx.session.user.id,
    //                 isDeleted: false,
    //             },
    //         });

    //         if (!endpoint) {
    //             throw new TRPCError({
    //                 code: "NOT_FOUND",
    //                 message: "Endpoint not found",
    //             });
    //         }

    //         // Calculate time range
    //         const startTime = new Date();
    //         startTime.setHours(startTime.getHours() - hours);

    //         const [logs, totalLogs, stats] = await Promise.all([
    //             ctx.prisma.log.findMany({
    //                 where: {
    //                     endpointId,
    //                     checkedAt: { gte: startTime },
    //                 },
    //                 orderBy: { checkedAt: 'desc' },
    //                 skip,
    //                 take: limit,
    //             }),
    //             ctx.prisma.log.count({
    //                 where: {
    //                     endpointId,
    //                     checkedAt: { gte: startTime },
    //                 },
    //             }),
    //             // Get quick stats
    //             Promise.all([
    //                 ctx.prisma.log.count({
    //                     where: { endpointId, status: "UP", checkedAt: { gte: startTime } },
    //                 }),
    //                 ctx.prisma.log.count({
    //                     where: { endpointId, status: "DOWN", checkedAt: { gte: startTime } },
    //                 }),
    //                 ctx.prisma.log.aggregate({
    //                     where: { endpointId, responseTime: { not: null }, checkedAt: { gte: startTime } },
    //                     _avg: { responseTime: true },
    //                 }),
    //             ]),
    //         ]);

    //         const [upCount, downCount, avgResponse] = stats;
    //         const totalChecks = upCount + downCount;
    //         const uptimePercentage = totalChecks > 0 ? ((upCount / totalChecks) * 100).toFixed(2) : "0.00";

    //         const totalPages = Math.ceil(totalLogs / limit);

    //         return {
    //             message: "Endpoint logs retrieved successfully",
    //             data: {
    //                 endpoint: {
    //                     id: endpoint.id,
    //                     name: endpoint.name,
    //                     url: endpoint.url,
    //                 },
    //                 logs,
    //                 stats: {
    //                     totalChecks,
    //                     upCount,
    //                     downCount,
    //                     uptimePercentage: `${uptimePercentage}%`,
    //                     avgResponseTime: avgResponse._avg.responseTime
    //                         ? Math.round(avgResponse._avg.responseTime)
    //                         : null,
    //                 },
    //             },
    //             pagination: {
    //                 total: totalLogs,
    //                 page,
    //                 limit,
    //                 totalPages,
    //             },
    //         };
    //     } catch (error: unknown) {
    //         if (error instanceof TRPCError) throw error;
    //         throw new TRPCError({
    //             code: "INTERNAL_SERVER_ERROR",
    //             message: error instanceof Error ? error.message : "Unknown error",
    //         });
    //     }
    // }),

    // GET - Get log statistics for a time range
    getLogStats: protectedProcedure.input(
        z.object({
            endpointId: z.string().optional(),
            projectId: z.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            days: z.number().int().min(1).max(90).optional().default(7),
        }).optional()
    ).query(async ({ ctx, input }) => {
        try {
            const days = input?.days ?? 7;
            const startDate = input?.startDate ?? new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const endDate = input?.endDate ?? new Date();

            // Build where clause
            const whereClause: any = {
                endpoint: { project: { userId: ctx.session.user.id } },
                checkedAt: {
                    gte: startDate,
                    lte: endDate,
                },
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

            // Get comprehensive statistics
            const [
                totalLogs,
                statusBreakdown,
                dnsBreakdown,
                responseTimeStats,
                sslStats,
                errorLogs,
            ] = await Promise.all([
                // Total logs count
                ctx.prisma.log.count({ where: whereClause }),

                // Status breakdown
                ctx.prisma.log.groupBy({
                    by: ['status'],
                    where: whereClause,
                    _count: true,
                }),

                // DNS status breakdown
                ctx.prisma.log.groupBy({
                    by: ['dnsStatus'],
                    where: whereClause,
                    _count: true,
                }),

                // Response time statistics
                ctx.prisma.log.aggregate({
                    where: { ...whereClause, responseTime: { not: null } },
                    _avg: { responseTime: true },
                    _min: { responseTime: true },
                    _max: { responseTime: true },
                }),

                // SSL statistics
                ctx.prisma.log.groupBy({
                    by: ['sslValid'],
                    where: whereClause,
                    _count: true,
                }),

                // Recent errors
                ctx.prisma.log.findMany({
                    where: {
                        ...whereClause,
                        errorMessage: { not: null },
                    },
                    select: {
                        id: true,
                        status: true,
                        errorMessage: true,
                        checkedAt: true,
                        endpoint: {
                            select: {
                                name: true,
                                url: true,
                            },
                        },
                    },
                    orderBy: { checkedAt: 'desc' },
                    take: 10,
                }),
            ]);

            // Format status breakdown
            const statusCounts: Record<string, number> = {};
            statusBreakdown.forEach(item => {
                statusCounts[item.status] = item._count;
            });

            // Format DNS breakdown
            const dnsCounts: Record<string, number> = {};
            dnsBreakdown.forEach(item => {
                dnsCounts[item.dnsStatus] = item._count;
            });

            // Format SSL breakdown
            const sslCounts = {
                valid: sslStats.find(s => s.sslValid)?._count ?? 0,
                invalid: sslStats.find(s => !s.sslValid)?._count ?? 0,
            };

            // Calculate uptime percentage
            const upCount = statusCounts.UP ?? 0;
            const downCount = statusCounts.DOWN ?? 0;
            const totalChecks = upCount + downCount;
            const uptimePercentage = totalChecks > 0 ? ((upCount / totalChecks) * 100).toFixed(2) : "0.00";

            return {
                message: "Log statistics retrieved successfully",
                data: {
                    overview: {
                        totalLogs,
                        totalChecks,
                        uptimePercentage: `${uptimePercentage}%`,
                        timeRange: {
                            start: startDate,
                            end: endDate,
                            days,
                        },
                    },
                    statusBreakdown: statusCounts,
                    dnsBreakdown: dnsCounts,
                    sslBreakdown: sslCounts,
                    responseTime: {
                        avg: responseTimeStats._avg.responseTime
                            ? Math.round(responseTimeStats._avg.responseTime)
                            : null,
                        min: responseTimeStats._min.responseTime,
                        max: responseTimeStats._max.responseTime,
                    },
                    recentErrors: errorLogs,
                },
            };
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }),

    // GET - Get downtime incidents
    // getDowntimeIncidents: protectedProcedure.input(
    //     z.object({
    //         endpointId: z.string().optional(),
    //         projectId: z.string().optional(),
    //         days: z.number().int().min(1).max(90).optional().default(30),
    //         minDuration: z.number().int().min(1).optional(), // in minutes
    //     }).optional()
    // ).query(async ({ ctx, input }) => {
    //     try {
    //         const days = input?.days ?? 30;
    //         const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    //         const whereClause: any = {
    //             endpoint: { userId: ctx.session.user.id },
    //             status: "DOWN",
    //             checkedAt: { gte: startDate },
    //         };

    //         if (input?.endpointId) {
    //             whereClause.endpointId = input.endpointId;
    //         }

    //         if (input?.projectId) {
    //             whereClause.endpoint = {
    //                 ...whereClause.endpoint,
    //                 projectId: input.projectId,
    //             };
    //         }

    //         const downtimeLogs = await ctx.prisma.log.findMany({
    //             where: whereClause,
    //             include: {
    //                 endpoint: {
    //                     select: {
    //                         id: true,
    //                         name: true,
    //                         url: true,
    //                         project: {
    //                             select: {
    //                                 projectName: true,
    //                             },
    //                         },
    //                     },
    //                 },
    //             },
    //             orderBy: { checkedAt: 'desc' },
    //         });

    //         // Group consecutive downtime logs into incidents
    //         const incidents: Array<{
    //             endpointId: string;
    //             endpointName: string;
    //             endpointUrl: string;
    //             projectName: string | null;
    //             startTime: Date;
    //             endTime: Date | null;
    //             duration: number | null; // in minutes
    //             logCount: number;
    //             errorMessages: string[];
    //         }> = [];

    //         let currentIncident: any = null;

    //         for (const log of downtimeLogs.reverse()) {
    //             if (!currentIncident || currentIncident.endpointId !== log.endpointId) {
    //                 // Start new incident
    //                 if (currentIncident) {
    //                     incidents.push(currentIncident);
    //                 }
    //                 currentIncident = {
    //                     endpointId: log.endpointId!,
    //                     endpointName: log.endpoint?.name ?? "Unknown",
    //                     endpointUrl: log.endpoint?.url ?? "",
    //                     projectName: log.endpoint?.project?.projectName ?? null,
    //                     startTime: log.checkedAt,
    //                     endTime: log.checkedAt,
    //                     duration: 0,
    //                     logCount: 1,
    //                     errorMessages: log.errorMessage ? [log.errorMessage] : [],
    //                 };
    //             } else {
    //                 // Continue existing incident
    //                 currentIncident.endTime = log.checkedAt;
    //                 currentIncident.logCount++;
    //                 if (log.errorMessage && !currentIncident.errorMessages.includes(log.errorMessage)) {
    //                     currentIncident.errorMessages.push(log.errorMessage);
    //                 }
    //             }
    //         }

    //         // Push last incident
    //         if (currentIncident) {
    //             incidents.push(currentIncident);
    //         }

    //         // Calculate durations and filter by minDuration
    //         const processedIncidents = incidents
    //             .map(incident => ({
    //                 ...incident,
    //                 duration: incident.endTime
    //                     ? Math.round((incident.endTime.getTime() - incident.startTime.getTime()) / (1000 * 60))
    //                     : null,
    //             }))
    //             .filter(incident => !input?.minDuration || (incident.duration && incident.duration >= input.minDuration))
    //             .reverse(); // Most recent first

    //         return {
    //             message: "Downtime incidents retrieved successfully",
    //             data: {
    //                 totalIncidents: processedIncidents.length,
    //                 incidents: processedIncidents,
    //             },
    //         };
    //     } catch (error: unknown) {
    //         throw new TRPCError({
    //             code: "INTERNAL_SERVER_ERROR",
    //             message: error instanceof Error ? error.message : "Unknown error",
    //         });
    //     }
    // }),

    // DELETE - Bulk delete old logs (cleanup utility)
    cleanupOldLogs: protectedProcedure.input(
        z.object({
            daysToKeep: z.number().int().min(7).max(365).default(90),
            endpointId: z.string().optional(),
        }).optional()
    ).mutation(async ({ ctx, input }) => {
        try {
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
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
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
        try {
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
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }),
});