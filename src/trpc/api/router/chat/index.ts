import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc";
import { z } from "zod";

export const chat = createTRPCRouter({
    getHistory: protectedProcedure
        .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
        .query(async ({ ctx, input }) => {
            const messages = await ctx.prisma.chatMessage.findMany({
                where: { userId: ctx.session.user.id },
                orderBy: { createdAt: "asc" },
                take: input.limit,
                select: {
                    id: true,
                    role: true,
                    content: true,
                    createdAt: true,
                },
            });
            return { data: messages };
        }),

    clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
        await ctx.prisma.chatMessage.deleteMany({
            where: { userId: ctx.session.user.id },
        });
        return { success: true };
    }),
});
