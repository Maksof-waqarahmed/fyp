import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const project = createTRPCRouter({

    create: protectedProcedure.input(
        z.object({
            projectName: z.string().min(2, "Project Name must be greater than 2 characters").trim(),
            description: z.string().optional()
        })
    ).mutation(async ({ ctx, input }) => {
        const userID = ctx.session.user.id;
        try {
            await ctx.prisma.project.create({
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
                message: "Project created successfully"
            }
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    }),

    getAllProjects: protectedProcedure.input(
        z.object({
            page: z.number().int().min(1).default(1),
            limit: z.number().int().min(1).max(100).default(2),
        })
    ).query(async ({ ctx, input }) => {
        const { page, limit } = input;
        const skip = (page - 1) * limit;

        const projects = await ctx.prisma.project.findMany({
            where: {
                userId: ctx.session.user.id,
                isDeleted: false
            },
            select: {
                id: true,
                projectName: true,
                description: true,
                createdAt: true,
                updatedAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        })

        const totalProjects = await ctx.prisma.project.count({
            where: {
                userId: ctx.session.user.id,
                isDeleted: false
            }
        })

        const totalPages = Math.ceil(totalProjects / limit);

        return {
            message: "Projects retrieved successfully",
            data: projects,
            total: totalProjects,
            page,
            totalPages
        }
    }),

    getRecentProjects: protectedProcedure.query(async ({ ctx }) => {
        const projects = await ctx.prisma.project.findMany({
            where: {
                userId: ctx.session.user.id,
                isDeleted: false
            },
            select: {
                id: true,
                projectName: true,
                description: true,
                createdAt: true,
                updatedAt: true,
            },
            take: 7,
            orderBy: { createdAt: 'desc' },
        })

        return {
            message: "Recent projects retrieved successfully",
            data: projects,
            total: projects.length
        }
    }),

    getProject: protectedProcedure.input(
        z.object({
            projectID: z.string().min(1, "Project ID is required"),
        })
    ).query(async ({ ctx, input }) => {
        const project = await ctx.prisma.project.findFirst({
            where: {
                id: input.projectID,
                userId: ctx.session.user.id,
                isDeleted: false
            },
            include: {
                endpoints: {
                    select: {
                        id: true,
                        createdAt: true,
                        checkInterval: true,
                        lastCheckedAt: true,
                        lastStatus: true,
                        name: true,
                        url: true
                    }
                },
                _count: {
                    select: {
                        endpoints: {
                            where: { isDeleted: false }
                        }
                    }
                }
            }
        });

        if (!project) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Project not found",
            });
        }

        return {
            message: "Project retrieved successfully",
            data: project
        }
    }),

    editProject: protectedProcedure.input(
        z.object({
            projectID: z.string().min(1, "Project ID is required"),
            projectName: z.string().trim().min(2, "Project Name must be greater than 2 characters").optional(),
            description: z.string().optional(),
        })
    ).mutation(async ({ ctx, input }) => {
        const { projectID, projectName, description } = input;

        if (!projectName && description === undefined) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "At least one field is required to update",
            });
        }

        try {
            const project = await ctx.prisma.project.findFirst({
                where: {
                    id: projectID,
                    userId: ctx.session.user.id,
                    isDeleted: false
                },
            });

            if (!project) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Project not found",
                });
            }

            await ctx.prisma.project.update({
                where: {
                    id: projectID,
                },
                data: {
                    ...(projectName && { projectName }),
                    ...(description !== undefined && { description }),
                },
            });

            return {
                message: "Project updated successfully"
            };
        } catch (error) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    }),

    deleteProject: protectedProcedure.input(
        z.object({
            projectID: z.string().min(1, "Project ID is required"),
        })
    ).mutation(async ({ ctx, input }) => {
        const { projectID } = input;

        try {
            const project = await ctx.prisma.project.findFirst({
                where: {
                    id: projectID,
                    userId: ctx.session.user.id,
                    isDeleted: false
                },
            });

            if (!project) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Project not found",
                });
            }
            await ctx.prisma.project.update({
                where: {
                    id: projectID,
                },
                data: {
                    isDeleted: true,
                },
            });

            return {
                message: "Project deleted successfully",
            };
        } catch (error) {
            if (error instanceof TRPCError) throw error;
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    })
})