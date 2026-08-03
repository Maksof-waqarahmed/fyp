import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { predictEndpointFailure } from "@/lib/failure-predictor";

export const prediction = createTRPCRouter({
    // GET — failure-risk prediction for one endpoint (live compute, no AI cost).
    getEndpointRisk: protectedProcedure
        .input(z.object({ endpointId: z.string() }))
        .query(async ({ ctx, input }) => {
            const endpoint = await ctx.prisma.endpoint.findFirst({
                where: {
                    id: input.endpointId,
                    isDeleted: false,
                    project: { userId: ctx.session.user.id, isDeleted: false },
                },
                select: { id: true, name: true, url: true },
            });
            if (!endpoint) throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });

            const prediction = await predictEndpointFailure(ctx.prisma, endpoint.id);
            return { endpoint, prediction };
        }),

    // GET — risk for every endpoint the user owns (dashboard overview).
    getAllRisks: protectedProcedure.query(async ({ ctx }) => {
        const endpoints = await ctx.prisma.endpoint.findMany({
            where: { isDeleted: false, project: { userId: ctx.session.user.id, isDeleted: false } },
            select: { id: true, name: true, url: true, lastStatus: true, project: { select: { projectName: true } } },
            orderBy: { createdAt: "desc" },
        });

        const results = await Promise.all(
            endpoints.map(async (e) => {
                const prediction = await predictEndpointFailure(ctx.prisma, e.id);
                return {
                    id: e.id,
                    name: e.name,
                    url: e.url,
                    projectName: e.project.projectName,
                    lastStatus: e.lastStatus,
                    riskScore: prediction.riskScore,
                    riskLevel: prediction.riskLevel,
                    hasEnoughData: prediction.hasEnoughData,
                    factors: prediction.factors.slice(0, 4),
                    forecast: prediction.forecast,
                };
            })
        );

        // Highest risk first so the dashboard leads with what needs attention.
        results.sort((a, b) => b.riskScore - a.riskScore);
        return results;
    }),
});
