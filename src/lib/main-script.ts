import { sendEmailAlert, sendSlackAlert } from "@/services/alert-services";
import { DNSStatus, HTTPStatus } from "../../prisma/generated/prisma/enums";
import { decrypt } from "./enc-dec";
import { checkDNS, checkEndpoint, checkSSL, getContentHash } from "./log-script";
import prisma from "./prisma";

export async function getUrlsandRunScript() {
    try {
        const endpoints = await prisma.endpoint.findMany({
            where: {
                isDeleted: false,
                nextCheckAt: { lte: new Date() },
            },
            select: {
                id: true,
                name: true,
                url: true,
                checkInterval: true,
                userId: true,
                consecutiveFails: true,
                lastAlertedStatus: true,
            },
        });

        for (const endpoint of endpoints) {
            const now = new Date();
            const hostname = new URL(endpoint.url).hostname;

            const [dnsResult, sslResult, httpResult, contentResult] =
                await Promise.all([
                    checkDNS(hostname),
                    checkSSL(hostname),
                    checkEndpoint(endpoint.url),
                    getContentHash(endpoint.url),
                ]);

            const sslExpiry =
                sslResult?.sslExpiry &&
                    !isNaN(new Date(sslResult.sslExpiry).getTime())
                    ? new Date(sslResult.sslExpiry)
                    : null;

            const isFail =
                httpResult.status === "DOWN" ||
                httpResult.status === "UNKNOWN";

            const isUp = httpResult.status === "UP";

            let consecutiveFails = endpoint.consecutiveFails ?? 0;

            if (isFail) {
                consecutiveFails += 1;
            } else if (isUp) {
                consecutiveFails = 0;
            }

            await prisma.log.create({
                data: {
                    status: httpResult.status as HTTPStatus,
                    httpCode: httpResult.statusCode ?? null,
                    responseTime: httpResult.responseTime
                        ? Number(httpResult.responseTime)
                        : null,
                    errorMessage: httpResult.reason ?? null,
                    dnsStatus: dnsResult.dnsStatus as DNSStatus,
                    ip: dnsResult.ip ?? null,
                    sslValid: Boolean(sslResult.sslValid),
                    sslExpiry,
                    checkedAt: now,
                    date: now,
                    time: now,
                    endpointId: endpoint.id,
                    contentHash: contentResult.hash ?? null,
                    contentLength: contentResult.length ?? null,
                },
            });

            const shouldSendDownAlert =
                consecutiveFails >= 3 &&
                endpoint.lastAlertedStatus !== "DOWN";

            const shouldSendRecoveryAlert =
                isUp &&
                endpoint.lastAlertedStatus === "DOWN";

            const setting = await prisma.setting.findUnique({
                where: {
                    userId: endpoint.userId,
                },
                select: {
                    email: true,
                    slackWebhook: true,
                    slackWebhookIv: true,
                    slackWebhookAuthTag: true,
                },
            });

            if (setting) {
                const hasSlack =
                    !!setting.slackWebhook &&
                    !!setting.slackWebhookIv &&
                    !!setting.slackWebhookAuthTag;

                const slackWebhook =
                    hasSlack &&
                    decrypt(
                        setting.slackWebhook!,
                        setting.slackWebhookIv!,
                        setting.slackWebhookAuthTag!
                    );

                if (shouldSendDownAlert) {
                    if (setting.email) {
                        await sendEmailAlert(
                            setting.email,
                            `🔴 ${endpoint.url} is DOWN`
                        );
                    }

                    if (hasSlack && slackWebhook) {
                        await sendSlackAlert(
                            slackWebhook,
                            `🔴 ${endpoint.url} is DOWN`
                        );
                    }
                }

                if (shouldSendRecoveryAlert) {
                    if (setting.email) {
                        await sendEmailAlert(
                            setting.email,
                            `🟢 ${endpoint.url} is UP again`
                        );
                    }

                    if (hasSlack && slackWebhook) {
                        await sendSlackAlert(
                            slackWebhook,
                            `🟢 ${endpoint.url} is UP again`
                        );
                    }
                }
            }

            await prisma.endpoint.update({
                where: { id: endpoint.id },
                data: {
                    nextCheckAt: new Date(
                        now.getTime() + endpoint.checkInterval * 60 * 1000
                    ),
                    consecutiveFails,
                    lastCheckedAt: now,
                    lastStatus: httpResult.status as HTTPStatus,

                    ...(shouldSendDownAlert && {
                        lastAlertedStatus: "DOWN",
                    }),

                    ...(shouldSendRecoveryAlert && {
                        lastAlertedStatus: "UP",
                    }),
                },
            });
        }
    } catch (error) {
        console.error("❌ Error checking websites:", error);
    }
}
