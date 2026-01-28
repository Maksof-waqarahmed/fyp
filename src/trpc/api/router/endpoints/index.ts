import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const project = createTRPCRouter({
    create: protectedProcedure.input(
        z.object({
            projectName: z.string().min(2, "Project Name must be gretaer than 2 char"),
            description: z.string().optional()
        })
    ).mutation(async ({ ctx, input }) => {
        const userID = ctx.session.user.id;
        try {
            const project = await ctx.prisma.project.create({
                data: {
                    projectName: input.projectName,
                    ...(input.description && { description: input.description }),
                    user: {
                        connect: {
                            id: userID
                        }
                    }
                },
            })

            return {
                message: "Project created successfully",
                data: project
            }
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }

    }),
    getAllProjects: protectedProcedure.input(z.object({
        page: z.number().default(1),
        limit: z.number().default(5).optional(),
    })).query(async ({ ctx, input }) => {
        const { page, limit } = input;
        const skip = (page - 1) * (limit || 5);
        const projects = await ctx.prisma.project.findMany({
            where: {
                userId: ctx.session.user.id
            },
            select: {
                id: true,
                projectName: true,
                description: true,
                createdAt: true,
            },
            skip,
            take: limit,
        })

        const totalProjects = await ctx.prisma.project.count({
            where: {
                userId: ctx.session.user.id
            }
        })

        const totalPages = Math.ceil(totalProjects / (limit || 5));
        return {
            projects,
            totalProjects,
            page,
            totalPages
        }
    }),
    addEndPoints: protectedProcedure.input(
        z.object({
            endPoints: z.array(
                z.object({
                    name: z.string().trim().min(2, "Name must be at least 2 characters"),
                    url: z.string().url("Invalid URL"),
                    checkInterval: z.number().int().min(1),
                    projectID: z.string().min(1, "Project ID is required")
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
                nextCheckAt: new Date(Date.now() + Math.max(Number(ep.checkInterval), 1) * 60 * 60 * 1000)
            }));

            const endpoint = await ctx.prisma.endpoint.createMany({
                data: endpointsData,
                skipDuplicates: true,
            });

            return {
                message: "Endpoints added successfully",
                data: endpoint
            }
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    })
})