import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const project = createTRPCRouter({
    create: protectedProcedure.input(
        z.object({
            projectName: z.string().min(2, "Project Name must be gretaer than 2 char")
        })
    ).mutation(async ({ ctx, input }) => {
        const userID = ctx.session.user.id;
        try {
            return await ctx.prisma.project.create({
                data: {
                    projectName: input.projectName,
                    user: {
                        connect: {
                            id: userID
                        }
                    }
                }
            })
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }

    }),
    addEndPoints: protectedProcedure.input(
        z.object({
            endPoints: z.array(
                z.object({
                    name: z.string().trim().min(2, "Name must be at least 2 characters"),
                    url: z.string().url("Invalid URL"),
                    checkInterval: z.number().int().min(1),
                    projectID: z.string()
                })
            ).min(1, "At least one endpoint is required")

        })
    ).mutation(async ({ ctx, input }) => {
        const now = new Date();

        const todayDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
        try {
            const endpointsData = input.endPoints.map((ep) => ({
                name: ep.name,
                url: ep.url,
                checkInterval: ep.checkInterval,
                projectId: ep.projectID,
                userId: ctx.session.user.id,
                date: todayDate,
                time: now,
                nextCheckAt: new Date(Date.now() + Number(ep.checkInterval) * 60 * 1000)
            }));

            return await ctx.prisma.endpoint.createMany({
                data: endpointsData,
                skipDuplicates: true,
            });

        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    })
})