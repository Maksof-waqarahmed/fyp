import { encrypt } from "@/lib/enc-dec"
import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc"
import { TRPCError } from "@trpc/server"
import z from "zod"

export const userSetting = createTRPCRouter({
    getSettingDetail: protectedProcedure.query(async ({ ctx }) => {
        const setting = await ctx.prisma.setting.findUnique({
            where: {
                userId: ctx.session.user.id
            },
            select: {
                email: true,
                slackWebhook: true,
                whatsappNumber: true,
            }
        })

        return {
            email: !!setting?.email,
            slackWebhook: !!setting?.slackWebhook,
            whatsappNumber: !!setting?.whatsappNumber,
        }
    }),

    alertSetting: protectedProcedure
        .input(
            z.object({
                email: z.string().email().optional(),
                slackWebhook: z.string().url().optional(),
                whatsappNumber: z.string().min(11).max(15).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            let encryptedSlack = null;

            if (input.slackWebhook) {
                encryptedSlack = encrypt(input.slackWebhook);
            }

            const payload = {
                ...(input.email && { email: input.email }),
                ...(input.whatsappNumber && { whatsappNumber: input.whatsappNumber }),
                ...(encryptedSlack && {
                    slackWebhook: encryptedSlack.encryptedData,
                    slackWebhookIv: encryptedSlack.iv,
                    slackWebhookAuthTag: encryptedSlack.authTag,
                }),
            };

            try {
                await ctx.prisma.setting.upsert({
                    where: {
                        userId,
                    },
                    update: payload,
                    create: { userId, ...payload },
                });
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message ?? "Failed to save settings",
                });
            }
        })
})