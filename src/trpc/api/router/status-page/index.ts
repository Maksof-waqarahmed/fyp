import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "node:crypto";

const BCRYPT_ROUNDS = 10;

function generateSlug(): string {
    // 12 hex chars — short, URL-safe, collision-resistant for the few thousand pages a single tenant might own
    return crypto.randomBytes(6).toString("hex");
}

function generateEmbedKey(): string {
    // base32-style, prefixed for at-a-glance recognition
    return "sp_" + crypto.randomBytes(12).toString("hex");
}

export const statusPage = createTRPCRouter({

    create: protectedProcedure.input(
        z.object({
            title: z.string().min(2, "Title must be at least 2 characters").trim(),
            description: z.string().optional(),
            projectIds: z.array(z.string()).min(1, "Select at least one project"),
        })
    ).mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;

        const userProjects = await ctx.prisma.project.findMany({
            where: { id: { in: input.projectIds }, userId, isDeleted: false },
            select: { id: true },
        });
        if (userProjects.length !== input.projectIds.length) {
            throw new TRPCError({ code: "FORBIDDEN", message: "One or more projects do not belong to you." });
        }

        // Auto-generate slug + embedKey, retrying once on the rare collision
        let slug = generateSlug();
        let embedKey = generateEmbedKey();

        const collision = await ctx.prisma.statusPage.findFirst({
            where: { OR: [{ slug }, { embedKey }] },
            select: { id: true },
        });
        if (collision) {
            slug = generateSlug();
            embedKey = generateEmbedKey();
        }

        const created = await ctx.prisma.statusPage.create({
            data: {
                title: input.title,
                slug,
                embedKey,
                description: input.description,
                userId,
                projects: { connect: input.projectIds.map(id => ({ id })) },
            },
        });

        return {
            message: "Status page created successfully",
            id: created.id,
            embedKey: created.embedKey,
        };
    }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
        const pages = await ctx.prisma.statusPage.findMany({
            where: { userId: ctx.session.user.id },
            include: {
                projects: {
                    where: { isDeleted: false },
                    select: {
                        id: true,
                        projectName: true,
                        _count: { select: { endpoints: { where: { isDeleted: false } } } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return {
            message: "Status pages retrieved successfully",
            data: pages.map(p => ({
                ...p,
                accessKeyHash: undefined,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            })),
        };
    }),

    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const page = await ctx.prisma.statusPage.findFirst({
                where: { id: input.id, userId: ctx.session.user.id },
                include: {
                    projects: {
                        where: { isDeleted: false },
                        select: { id: true, projectName: true },
                    },
                },
            });
            if (!page) throw new TRPCError({ code: "NOT_FOUND", message: "Status page not found." });

            return {
                ...page,
                accessKeyHash: undefined,
                hasAccessKey: !!page.accessKeyHash,
                createdAt: page.createdAt.toISOString(),
                updatedAt: page.updatedAt.toISOString(),
            };
        }),

    delete: protectedProcedure.input(
        z.object({ id: z.string() })
    ).mutation(async ({ ctx, input }) => {
        const page = await ctx.prisma.statusPage.findFirst({
            where: { id: input.id, userId: ctx.session.user.id },
        });
        if (!page) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Status page not found." });
        }
        await ctx.prisma.statusPage.delete({ where: { id: input.id } });
        return { message: "Status page deleted successfully" };
    }),

    regenerateEmbedKey: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const page = await ctx.prisma.statusPage.findFirst({
                where: { id: input.id, userId: ctx.session.user.id },
            });
            if (!page) throw new TRPCError({ code: "NOT_FOUND", message: "Status page not found." });

            const embedKey = generateEmbedKey();
            await ctx.prisma.statusPage.update({
                where: { id: input.id },
                data: { embedKey },
            });

            return { message: "Embed key regenerated. Update your reverse-proxy config.", embedKey };
        }),

    // ─── Visibility ────────────────────────────────────────────────────────────

    setVisibility: protectedProcedure
        .input(z.object({
            id: z.string(),
            visibility: z.enum(["PUBLIC", "PASSWORD"]),
            password: z.string().min(6).max(128).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const page = await ctx.prisma.statusPage.findFirst({
                where: { id: input.id, userId },
            });
            if (!page) throw new TRPCError({ code: "NOT_FOUND", message: "Status page not found." });

            const data: any = { visibility: input.visibility };

            if (input.visibility === "PUBLIC") {
                data.accessKeyHash = null;
            } else if (input.visibility === "PASSWORD") {
                if (!input.password && !page.accessKeyHash) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Password is required when switching to PASSWORD visibility." });
                }
                if (input.password) {
                    data.accessKeyHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
                }
            }

            await ctx.prisma.statusPage.update({
                where: { id: input.id },
                data,
            });

            return { message: `Visibility updated to ${input.visibility}.` };
        }),
});
