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
            }
        })

        return {
            email: setting?.email || "",
            slackWebhook: setting?.slackWebhook || "",
        }
    }),

    alertSetting: protectedProcedure
        .input(
            z.object({
                email: z.string().email().optional(),
                slackWebhook: z.string().url().optional(),
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

                return { message: "Setting updated successfully" }
            } catch (error: unknown) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "Unknown error",
                });
            }
        })
})