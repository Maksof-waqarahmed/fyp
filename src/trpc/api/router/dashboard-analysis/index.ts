import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";

export const dashboardAnalysis = createTRPCRouter({
    getAnalysis: protectedProcedure.query(async ({ ctx }) => {
        const now = new Date()

        const startOfWeek = new Date(now)
        const day = now.getDay() || 7
        startOfWeek.setDate(now.getDate() - day + 1)
        startOfWeek.setHours(0, 0, 0, 0)

        try {
            const [
                projectCount,
                currentMonthEndpoints,
                totalEndpoints,
                totalUpLogs,
                totalDownLogs,
                currentWeekUp,
                currentWeekDown,
            ] = await Promise.all([
                ctx.prisma.project.count({
                    where: { userId: ctx.session.user.id },
                }),

                ctx.prisma.endpoint.count({
                    where: {
                        isDeleted: false,
                        project: { userId: ctx.session.user.id },
                        createdAt: {
                            gte: new Date(now.getFullYear(), now.getMonth(), 1),
                            lte: now,
                        },
                    },
                }),

                ctx.prisma.endpoint.count({
                    where: {
                        isDeleted: false,
                        project: { userId: ctx.session.user.id },
                    },
                }),

                ctx.prisma.log.count({
                    where: {
                        status: "UP",
                        endpoint: { project: { userId: ctx.session.user.id } },
                    },
                }),

                ctx.prisma.log.count({
                    where: {
                        status: "DOWN",
                        endpoint: { project: { userId: ctx.session.user.id } },
                    },
                }),

                ctx.prisma.log.count({
                    where: {
                        status: "UP",
                        endpoint: { project: { userId: ctx.session.user.id } },
                        date: {
                            gte: startOfWeek,
                            lte: now,
                        },
                    },
                }),

                ctx.prisma.log.count({
                    where: {
                        status: "DOWN",
                        endpoint: { project: { userId: ctx.session.user.id } },
                        date: {
                            gte: startOfWeek,
                            lte: now,
                        },
                    },
                }),
            ])


            return {
                projectCount,
                totalEndpoints,
                currentMonthEndpoints,
                totalUpLogs,
                totalDownLogs,
                currentWeekUp,
                currentWeekDown,
            };
        } catch (error: unknown) {

            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    })
})