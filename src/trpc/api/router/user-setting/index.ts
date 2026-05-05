
import { decrypt, encrypt } from "@/lib/enc-dec"
import { sendEmailAlert, sendSlackAlert } from "@/services/alert-services"
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
                isActive: setting?.isActive ?? true,
            }
        }
    }),

    alertSetting: protectedProcedure
        .input(
            z.object({
                email: z.string().email("Invalid email format").optional(),
                slackWebhook: z.string().url("Invalid Slack webhook URL").optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            if (!input.email && !input.slackWebhook) {
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
                channel: z.enum(["email", "slack"]),
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
                }
            });

            if (input.channel === "email") {
                if (!setting?.email) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Email not configured" });
                }
                const result = await sendEmailAlert(
                    setting.email,
                    "✅ Test notification from your Uptime Monitor — if you see this, email alerts are working.",
                    "Uptime Monitor — test alert"
                );
                if (!result?.messageId) {
                    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send test email" });
                }
                return { message: `Test email sent to ${setting.email}` };
            }

            if (input.channel === "slack") {
                if (!setting?.slackWebhook || !setting.slackWebhookIv || !setting.slackWebhookAuthTag) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Slack webhook not configured" });
                }

                let webhookUrl: string;
                try {
                    webhookUrl = decrypt(
                        setting.slackWebhook,
                        setting.slackWebhookIv,
                        setting.slackWebhookAuthTag
                    );
                } catch {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Could not decrypt Slack webhook. Try saving the URL again.",
                    });
                }

                const result = await sendSlackAlert(
                    webhookUrl,
                    "✅ *Test notification* from your Uptime Monitor — if you see this, Slack alerts are working."
                );
                if (!result.success) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: result.lastError ?? "Slack rejected the message",
                    });
                }
                return { message: "Test message sent to Slack" };
            }

            return { message: "No channel selected" };
        })
})