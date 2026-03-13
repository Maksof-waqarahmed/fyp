
import { decrypt, encrypt } from "@/lib/enc-dec"
import { createTRPCRouter, protectedProcedure } from "@/trpc/trpc"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

export const userSetting = createTRPCRouter({

    getSettingDetail: protectedProcedure.query(async ({ ctx }) => {
        const setting = await ctx.prisma.setting.findUnique({
            where: {
                userId: ctx.session.user.id
            },
            select: {
                email: true,
                slackWebhook: true,
                slackWebhookIv: true,
                slackWebhookAuthTag: true,
                whatsappNumber: true,
                isActive: true,
            }
        })

        let decryptedSlackWebhook = "";
        if (setting?.slackWebhook && setting?.slackWebhookIv && setting?.slackWebhookAuthTag) {
            decryptedSlackWebhook = decrypt(setting.slackWebhook, setting.slackWebhookIv, setting.slackWebhookAuthTag);
        }

        return {
            message: "Settings retrieved successfully",
            data: {
                email: setting?.email || "",
                slackWebhook: decryptedSlackWebhook,
                whatsappNumber: setting?.whatsappNumber || "",
                isActive: setting?.isActive ?? true,
            }
        }
    }),

    alertSetting: protectedProcedure
        .input(
            z.object({
                email: z.string().email("Invalid email format").optional(),
                slackWebhook: z.string().url("Invalid Slack webhook URL").optional(),
                whatsappNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            if (!input.email && !input.slackWebhook && !input.whatsappNumber) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "At least one field is required to update",
                });
            }

            let encryptedSlack = null;

            if (input.slackWebhook) {
                encryptedSlack = encrypt(input.slackWebhook);
            }

            const payload: any = {};

            if (input.email !== undefined) {
                payload.email = input.email;
            }

            if (encryptedSlack) {
                payload.slackWebhook = encryptedSlack.encryptedData;
                payload.slackWebhookIv = encryptedSlack.iv;
                payload.slackWebhookAuthTag = encryptedSlack.authTag;
            }

            if (input.whatsappNumber !== undefined) {
                payload.whatsappNumber = input.whatsappNumber;
            }

            const updatedSetting = await ctx.prisma.setting.upsert({
                where: {
                    userId,
                },
                update: payload,
                create: { userId, ...payload },
            });

            return {
                message: "Settings updated successfully",
                data: {
                    isActive: updatedSetting.isActive,
                }
            }
        }),

    toggleNotifications: protectedProcedure
        .input(
            z.object({
                isActive: z.boolean(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const updatedSetting = await ctx.prisma.setting.upsert({
                where: { userId },
                update: { isActive: input.isActive },
                create: { userId, isActive: input.isActive },
            });

            return {
                message: `Notifications ${input.isActive ? "enabled" : "disabled"} successfully`,
                data: {
                    isActive: updatedSetting.isActive,
                }
            }
        }),

    testNotification: protectedProcedure
        .input(
            z.object({
                channel: z.enum(["email", "slack", "whatsapp"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const setting = await ctx.prisma.setting.findUnique({
                where: { userId },
                select: {
                    email: true,
                    slackWebhook: true,
                    slackWebhookIv: true,
                    slackWebhookAuthTag: true,
                    whatsappNumber: true,
                }
            });

            if (!setting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Settings not found",
                });
            }

            if (input.channel === "email" && !setting.email) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Email not configured",
                });
            }

            if (input.channel === "slack" && !setting.slackWebhook) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Slack webhook not configured",
                });
            }

            if (input.channel === "whatsapp" && !setting.whatsappNumber) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "WhatsApp number not configured",
                });
            }

            // Here you would implement actual notification sending logic
            // For now, just return success
            // TODO: Implement actual notification sending

            return {
                message: `Test notification sent to ${input.channel} successfully`,
            }
        })
})