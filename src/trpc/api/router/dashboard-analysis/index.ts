import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const dashboardAnalysis = createTRPCRouter({

    getAnalysis: protectedProcedure.query(async ({ ctx }) => {
        const now = new Date();
        const userId = ctx.session.user.id;

        const startOfWeek = new Date(now);
        const day = now.getDay() || 7;
        startOfWeek.setDate(now.getDate() - day + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [
            projectStats,
            endpointStats,
            logStats,
            recentDownEndpoints,
            upcomingChecks,
        ] = await Promise.all([
                ctx.prisma.project.aggregate({
                    where: {
                        userId,
                        isDeleted: false
                    },
                    _count: true,
                }),

                Promise.all([
                    ctx.prisma.endpoint.count({
                        where: {
                            project: { userId },
                            isDeleted: false,
                        },
                    }),
                    ctx.prisma.endpoint.count({
                        where: {
                            project: { userId },
                            isDeleted: false,
                            lastStatus: "UP",
                        },
                    }),
                    ctx.prisma.endpoint.count({
                        where: {
                            project: { userId },
                            isDeleted: false,
                            lastStatus: "DOWN",
                        },
                    }),
                    ctx.prisma.endpoint.count({
                        where: {
                            project: { userId },
                            isDeleted: false,
                            createdAt: {
                                gte: startOfMonth,
                            },
                        },
                    }),
                    ctx.prisma.endpoint.count({
                        where: {
                            project: { userId },
                            isDeleted: false,
                            createdAt: {
                                gte: startOfLastMonth,
                                lte: endOfLastMonth,
                            },
                        },
                    }),
                ]),

                // Log statistics — Log has no userId, goes through endpoint -> project
                Promise.all([
                    // Total logs
                    ctx.prisma.log.count({
                        where: {
                            endpoint: { project: { userId } },
                        },
                    }),
                    // Current week UP
                    ctx.prisma.log.count({
                        where: {
                            status: "UP",
                            endpoint: { project: { userId } },
                            checkedAt: {
                                gte: startOfWeek,
                            },
                        },
                    }),
                    // Current week DOWN
                    ctx.prisma.log.count({
                        where: {
                            status: "DOWN",
                            endpoint: { project: { userId } },
                            checkedAt: {
                                gte: startOfWeek,
                            },
                        },
                    }),
                    // Current month UP
                    ctx.prisma.log.count({
                        where: {
                            status: "UP",
                            endpoint: { project: { userId } },
                            checkedAt: {
                                gte: startOfMonth,
                            },
                        },
                    }),
                    // Current month DOWN
                    ctx.prisma.log.count({
                        where: {
                            status: "DOWN",
                            endpoint: { project: { userId } },
                            checkedAt: {
                                gte: startOfMonth,
                            },
                        },
                    }),
                    // Average response time this week
                    ctx.prisma.log.aggregate({
                        where: {
                            endpoint: { project: { userId } },
                            checkedAt: {
                                gte: startOfWeek,
                            },
                            responseTime: { not: null },
                        },
                        _avg: {
                            responseTime: true,
                        },
                    }),
                ]),

                // Recent down endpoints (last 5)
                ctx.prisma.endpoint.findMany({
                    where: {
                        project: { userId },
                        isDeleted: false,
                        lastStatus: "DOWN",
                    },
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        lastStatus: true,
                        lastCheckedAt: true,
                        project: {
                            select: {
                                projectName: true,
                            },
                        },
                    },
                    orderBy: {
                        lastCheckedAt: 'desc',
                    },
                    take: 5,
                }),

                // Upcoming checks (next 5)
                ctx.prisma.endpoint.findMany({
                    where: {
                        project: { userId },
                        isDeleted: false,
                        nextCheckAt: { not: null },
                    },
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        nextCheckAt: true,
                        checkInterval: true,
                    },
                    orderBy: {
                        nextCheckAt: 'asc',
                    },
                    take: 5,
                }),
        ]);

        const [totalEndpoints, activeEndpoints, downEndpoints, currentMonthEndpoints, lastMonthEndpoints] = endpointStats;
        const [totalLogs, currentWeekUp, currentWeekDown, currentMonthUp, currentMonthDown, avgResponseTime] = logStats;

        // Calculate uptime percentage
        const totalChecks = currentWeekUp + currentWeekDown;
        const weeklyUptime = totalChecks > 0 ? ((currentWeekUp / totalChecks) * 100).toFixed(2) : "0.00";

        const monthlyChecks = currentMonthUp + currentMonthDown;
        const monthlyUptime = monthlyChecks > 0 ? ((currentMonthUp / monthlyChecks) * 100).toFixed(2) : "0.00";

        // Calculate growth metrics
        const endpointGrowth = lastMonthEndpoints > 0
            ? (((currentMonthEndpoints - lastMonthEndpoints) / lastMonthEndpoints) * 100).toFixed(2)
            : "0.00";

        return {
            message: "Dashboard analysis retrieved successfully",
            data: {
                // Project metrics
                projects: {
                    total: projectStats._count,
                },

                // Endpoint metrics
                endpoints: {
                    total: totalEndpoints,
                    active: activeEndpoints,
                    down: downEndpoints,
                    inactive: totalEndpoints - activeEndpoints - downEndpoints,
                    currentMonth: currentMonthEndpoints,
                    lastMonth: lastMonthEndpoints,
                    growth: `${endpointGrowth}%`,
                },

                // Uptime metrics
                uptime: {
                    weekly: `${weeklyUptime}%`,
                    monthly: `${monthlyUptime}%`,
                    weeklyChecks: {
                        up: currentWeekUp,
                        down: currentWeekDown,
                        total: totalChecks,
                    },
                    monthlyChecks: {
                        up: currentMonthUp,
                        down: currentMonthDown,
                        total: monthlyChecks,
                    },
                },

                // Performance metrics
                performance: {
                    avgResponseTime: avgResponseTime._avg.responseTime
                        ? Math.round(avgResponseTime._avg.responseTime)
                        : null,
                    totalLogs,
                },

                // Alerts and upcoming
                alerts: {
                    recentDownEndpoints: recentDownEndpoints.map(ep => ({
                        ...ep,
                        lastCheckedAt: ep.lastCheckedAt?.toISOString() ?? null,
                    })),
                    upcomingChecks: upcomingChecks.map(ep => ({
                        ...ep,
                        nextCheckAt: ep.nextCheckAt?.toISOString() ?? null,
                    })),
                },
            },
        };
    }),

    // Get uptime trends for charts (last 7 or 30 days)
    // Log has no 'date' field — group by date extracted from checkedAt in memory
    getUptimeTrends: protectedProcedure.input(
        z.object({
            days: z.number().int().min(1).max(90).optional().default(7),
        }).optional()
    ).query(async ({ ctx, input }) => {
        const now = new Date();
        const days = input?.days ?? 7;
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const logs = await ctx.prisma.log.findMany({
            where: {
                endpoint: { project: { userId: ctx.session.user.id } },
                checkedAt: { gte: startDate },
            },
            select: {
                status: true,
                checkedAt: true,
            },
            orderBy: { checkedAt: 'asc' },
        });

        // Group by date string extracted from checkedAt
        const dailyData: Record<string, { date: string; up: number; down: number; other: number }> = {};

        logs.forEach((log) => {
            const dateKey = log.checkedAt.toISOString().split('T')[0]!;

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { date: dateKey, up: 0, down: 0, other: 0 };
            }

            if (log.status === 'UP') {
                dailyData[dateKey].up += 1;
            } else if (log.status === 'DOWN') {
                dailyData[dateKey].down += 1;
            } else {
                dailyData[dateKey].other += 1;
            }
        });

        const trends = Object.values(dailyData).map(day => ({
            date: day.date,
            up: day.up,
            down: day.down,
            other: day.other,
            total: day.up + day.down + day.other,
            uptimePercentage: day.up + day.down > 0
                ? ((day.up / (day.up + day.down)) * 100).toFixed(2)
                : "0.00",
        }));

        return {
            message: "Uptime trends retrieved successfully",
            data: trends,
        };
    }),

    // Get response time trends
    // Log has no 'date' field — group by date extracted from checkedAt in memory
    getResponseTimeTrends: protectedProcedure.input(
        z.object({
            endpointId: z.string().optional(),
            days: z.number().int().min(1).max(90).optional().default(7),
        }).optional()
    ).query(async ({ ctx, input }) => {
        const now = new Date();
        const days = input?.days ?? 7;
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const logs = await ctx.prisma.log.findMany({
            where: {
                endpoint: {
                    project: { userId: ctx.session.user.id },
                    ...(input?.endpointId ? { id: input.endpointId } : {}),
                },
                checkedAt: { gte: startDate },
                responseTime: { not: null },
            },
            select: {
                checkedAt: true,
                responseTime: true,
            },
            orderBy: { checkedAt: 'asc' },
        });

        // Group by date extracted from checkedAt, compute avg/min/max in memory
        const dailyData: Record<string, { date: string; times: number[] }> = {};

        logs.forEach((log) => {
            if (log.responseTime === null) return;
            const dateKey = log.checkedAt.toISOString().split('T')[0]!;

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { date: dateKey, times: [] };
            }
            dailyData[dateKey].times.push(log.responseTime);
        });

        const trends = Object.values(dailyData).map(day => {
            const times = day.times;
            const avg = times.length > 0
                ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
                : null;
            const min = times.length > 0 ? Math.min(...times) : null;
            const max = times.length > 0 ? Math.max(...times) : null;

            return {
                date: day.date,
                avgResponseTime: avg,
                minResponseTime: min,
                maxResponseTime: max,
            };
        });

        return {
            message: "Response time trends retrieved successfully",
            data: trends,
        };
    }),

    // Get endpoint health summary
    getEndpointHealthSummary: protectedProcedure.query(async ({ ctx }) => {
        const endpoints = await ctx.prisma.endpoint.findMany({
            where: {
                project: { userId: ctx.session.user.id },
                isDeleted: false,
            },
            select: {
                id: true,
                name: true,
                url: true,
                lastStatus: true,
                lastCheckedAt: true,
                checkInterval: true,
                project: {
                    select: {
                        projectName: true,
                    },
                },
                _count: {
                    select: {
                        logs: true,
                    },
                },
            },
            orderBy: {
                lastCheckedAt: 'desc',
            },
        });

        // Get last 24 hours uptime for each endpoint
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const endpointHealth = await Promise.all(
            endpoints.map(async (endpoint) => {
                const [upCount, downCount] = await Promise.all([
                    ctx.prisma.log.count({
                        where: {
                            endpointId: endpoint.id,
                            status: 'UP',
                            checkedAt: { gte: last24Hours },
                        },
                    }),
                    ctx.prisma.log.count({
                        where: {
                            endpointId: endpoint.id,
                            status: 'DOWN',
                            checkedAt: { gte: last24Hours },
                        },
                    }),
                ]);

                const totalChecks = upCount + downCount;
                const uptimePercentage = totalChecks > 0
                    ? ((upCount / totalChecks) * 100).toFixed(2)
                    : "0.00";

                return {
                    ...endpoint,
                    uptime24h: `${uptimePercentage}%`,
                    checks24h: totalChecks,
                };
            })
        );

        return {
            message: "Endpoint health summary retrieved successfully",
            data: endpointHealth,
        };
    }),

    // Get notification statistics
    getNotificationStats: protectedProcedure.input(
        z.object({
            days: z.number().int().min(1).max(90).optional().default(30),
        }).optional()
    ).query(async ({ ctx, input }) => {
        const days = input?.days ?? 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [totalNotifications, sentNotifications, failedNotifications] = await Promise.all([
            ctx.prisma.notification.count({
                where: {
                    endpoint: { project: { userId: ctx.session.user.id } },
                    sentAt: { gte: startDate },
                },
            }),
            ctx.prisma.notification.count({
                where: {
                    endpoint: { project: { userId: ctx.session.user.id } },
                    status: 'SEND',
                    sentAt: { gte: startDate },
                },
            }),
            ctx.prisma.notification.count({
                where: {
                    endpoint: { project: { userId: ctx.session.user.id } },
                    status: 'FAIL',
                    sentAt: { gte: startDate },
                },
            }),
        ]);

        const successRate = totalNotifications > 0
            ? ((sentNotifications / totalNotifications) * 100).toFixed(2)
            : "0.00";

        return {
            message: "Notification statistics retrieved successfully",
            data: {
                total: totalNotifications,
                sent: sentNotifications,
                failed: failedNotifications,
                successRate: `${successRate}%`,
            },
        };
    }),

    // Get top slowest endpoints
    getSlowestEndpoints: protectedProcedure.input(
        z.object({
            limit: z.number().int().min(1).max(20).optional().default(5),
            days: z.number().int().min(1).max(90).optional().default(7),
        }).optional()
    ).query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 5;
        const days = input?.days ?? 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const slowestEndpoints = await ctx.prisma.log.groupBy({
            by: ['endpointId'],
            where: {
                endpoint: {
                    project: { userId: ctx.session.user.id },
                    isDeleted: false,
                },
                checkedAt: { gte: startDate },
                responseTime: { not: null },
            },
            _avg: {
                responseTime: true,
            },
            orderBy: {
                _avg: {
                    responseTime: 'desc',
                },
            },
            take: limit,
        });

        const endpointsWithDetails = await Promise.all(
            slowestEndpoints.map(async (log) => {
                const endpoint = await ctx.prisma.endpoint.findUnique({
                    where: { id: log.endpointId! },
                    select: {
                        name: true,
                        url: true,
                        project: {
                            select: {
                                projectName: true,
                            },
                        },
                    },
                });

                return {
                    endpointId: log.endpointId,
                    name: endpoint?.name,
                    url: endpoint?.url,
                    projectName: endpoint?.project?.projectName,
                    avgResponseTime: log._avg.responseTime
                        ? Math.round(log._avg.responseTime)
                        : null,
                };
            })
        );

        return {
            message: "Slowest endpoints retrieved successfully",
            data: endpointsWithDetails,
        };
    }),
});
