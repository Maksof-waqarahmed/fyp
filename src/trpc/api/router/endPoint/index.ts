import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const endpoint = createTRPCRouter({

    addEndPoints: protectedProcedure.input(
        z.object({
            projectID: z.string().min(1, "Project ID is required"),
            endPoints: z.array(
                z.object({
                    name: z.string().trim().min(2, "Name must be at least 2 characters"),
                    url: z.string().url("Invalid URL"),
                    checkInterval: z.number().int().min(1),
                })
            ).min(1, "At least one endpoint is required")
        })
    ).mutation(async ({ ctx, input }) => {

        const projectExists = await ctx.prisma.project.findFirst({
            where: { id: input.projectID, userId: ctx.session.user.id, isDeleted: false },
        });
        if (!projectExists) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid project ID' });

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
                projectId: input.projectID,
                userId: ctx.session.user.id,
                date: todayDate,
                time: now,
                nextCheckAt: new Date(Date.now() + Math.max(Number(ep.checkInterval), 1) * 60 * 60 * 1000)
            }));

            await ctx.prisma.endpoint.createMany({
                data: endpointsData,
                skipDuplicates: true,
            });

            return {
                message: "Endpoints added successfully"
            }
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    }),

    getAllEndPoints: protectedProcedure.input(
        z.object({
            projectID: z.string().min(1, "Project ID is required"),
            page: z.number().int().min(1).default(1),
            limit: z.number().int().min(1).max(100).default(10),
        })
    ).query(async ({ ctx, input }) => {
        const { projectID, page, limit } = input;

        const projectExists = await ctx.prisma.project.findFirst({
            where: { id: projectID, userId: ctx.session.user.id, isDeleted: false },
        });
        if (!projectExists) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid project ID' });

        const skip = (page - 1) * limit;

        const endpoints = await ctx.prisma.endpoint.findMany({
            where: { projectId: projectID, userId: ctx.session.user.id, isDeleted: false },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        const totalEndpoints = await ctx.prisma.endpoint.count({
            where: { projectId: projectID, userId: ctx.session.user.id, isDeleted: false },
        });

        const totalPages = Math.ceil(totalEndpoints / limit);

        return {
            message: "Endpoints retrieved successfully",
            data: endpoints,
            total: totalEndpoints,
            page,
            totalPages,
        }
    }),

    getEndPoint: protectedProcedure.input(
        z.object({
            endpointID: z.string().min(1, "Endpoint ID is required"),
        })
    ).query(async ({ ctx, input }) => {
        const endpoint = await ctx.prisma.endpoint.findFirst({
            where: {
                id: input.endpointID,
                userId: ctx.session.user.id,
                isDeleted: false
            },
        });

        if (!endpoint) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Endpoint not found'
            });
        }

        return {
            message: "Endpoint retrieved successfully",
            data: endpoint
        }
    }),

    updateEndPoint: protectedProcedure.input(
        z.object({
            endpointID: z.string().min(1, "Endpoint ID is required"),
            name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
            url: z.string().url("Invalid URL").optional(),
            checkInterval: z.number().int().min(1).optional(),
        })
    ).mutation(async ({ ctx, input }) => {
        const { endpointID, ...updateData } = input;

        const existingEndpoint = await ctx.prisma.endpoint.findFirst({
            where: {
                id: endpointID,
                userId: ctx.session.user.id,
                isDeleted: false
            },
        });

        if (!existingEndpoint) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Endpoint not found'
            });
        }

        try {
            const updatedFields: any = { ...updateData };

            if (updateData.checkInterval) {
                updatedFields.nextCheckAt = new Date(
                    Date.now() + updateData.checkInterval * 60 * 60 * 1000
                );
            }

            const updatedEndpoint = await ctx.prisma.endpoint.update({
                where: { id: endpointID },
                data: updatedFields,
            });

            return {
                message: "Endpoint updated successfully",
                data: updatedEndpoint
            }
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    }),

    deleteEndPoint: protectedProcedure.input(
        z.object({
            endpointID: z.string().min(1, "Endpoint ID is required"),
        })
    ).mutation(async ({ ctx, input }) => {

        const existingEndpoint = await ctx.prisma.endpoint.findFirst({
            where: {
                id: input.endpointID,
                userId: ctx.session.user.id,
                isDeleted: false
            },
        });

        if (!existingEndpoint) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Endpoint not found'
            });
        }

        try {
            await ctx.prisma.endpoint.update({
                where: { id: input.endpointID },
                data: { isDeleted: true },
            });

            return {
                message: "Endpoint deleted successfully"
            }
        } catch (error: unknown) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        }
    }),
})