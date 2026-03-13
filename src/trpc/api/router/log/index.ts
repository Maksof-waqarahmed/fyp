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