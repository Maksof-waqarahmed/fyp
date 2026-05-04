import { SentMessageInfo } from "nodemailer";
import { SlackAlertResult } from "@/services/alert-services";
import {
    DNSResult,
    SSLCheckResult,
    ContentResult,
    EndPointType,
    EndpointDown,
    EndpointUp
} from "./log-script";
import { AlertStatus, DNSStatus, HTTPStatus } from "../../prisma/generated/prisma/enums";
import { PrismaClient } from "../../prisma/generated/prisma/client";

export type EndpointRef = {
    id: string;
    name: string;
    url: string;
    checkInterval: number;
    consecutiveDownCount: number;
    project: {
        projectName: string;
        id: string;
        user: {
            id: string;
            name: string;
            email: string;
            setting: {
                email: string | null;
                slackWebhook: string | null;
                slackWebhookIv: string | null;
                slackWebhookAuthTag: string | null;
                isActive: boolean;
            } | null;
        };
    };
};


export class MonitoringService {
    constructor(private prisma: PrismaClient) { }

    async getEndPoints(): Promise<EndpointRef[]> {
        try {
            const endpoints = await this.prisma.endpoint.findMany({
                where: { isDeleted: false, nextCheckAt: { lte: new Date() } },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    checkInterval: true,
                    consecutiveDownCount: true,
                    project: {
                        select: {
                            projectName: true,
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    setting: {
                                        select: {
                                            email: true,
                                            slackWebhook: true,
                                            slackWebhookIv: true,
                                            slackWebhookAuthTag: true,
                                            isActive: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            });

            console.log(`📊 Found ${endpoints.length} endpoints due for checking`);
            return endpoints;
        } catch (error) {
            console.error("❌ Error fetching endpoints:", error);
            return [];
        }
    }

    async createLogs(
        dnsResult: DNSResult,
        sslResult: SSLCheckResult,
        httpResult: EndPointType,
        contentResult: ContentResult,
        endpoint: EndpointRef
    ) {
        const now = new Date();
        const isDown = httpResult.status === "DOWN";

        const sslExpiry =
            sslResult?.sslExpiry && !isNaN(new Date(sslResult.sslExpiry).getTime())
                ? new Date(sslResult.sslExpiry)
                : null;

        await this.prisma.log.create({
            data: {
                status: httpResult.status as HTTPStatus,
                httpCode: !isDown ? (httpResult as EndpointUp).statusCode : null,
                responseTime: httpResult.responseTime ?? null,
                errorMessage: isDown ? (httpResult as EndpointDown).reason : null,
                dnsStatus: dnsResult.dnsStatus as DNSStatus,
                ip: dnsResult.ip,
                sslValid: sslResult.sslValid,
                sslExpiry,
                checkedAt: now,
                contentHash: contentResult.hash,
                contentLength: contentResult.length || null,
                endpointId: endpoint.id,
            },
        });
    }

    async updateEndPoints(
        endpoint: EndpointRef,
        httpResult: EndPointType,
        consecutiveDownCount: number
    ) {
        const now = new Date();
        const nextCheck = new Date(
            now.getTime() + Math.max(endpoint.checkInterval, 5) * 60 * 1000
        );

        try {
            await this.prisma.endpoint.update({
                where: { id: endpoint.id },
                data: {
                    nextCheckAt: nextCheck,
                    lastCheckedAt: now,
                    lastStatus: httpResult.status,
                    consecutiveDownCount,
                },
            });

            console.log(`✅ Updated ${endpoint.name}: nextCheckAt = ${nextCheck.toLocaleString()}, downCount = ${consecutiveDownCount}`);
        } catch (error) {
            console.error("❌ Error updating endpoint:", error);
        }
    }

    async createNotification(
        type: "EMAIL" | "SLACK",
        message: string,
        endpoint: EndpointRef,
        result: SentMessageInfo | null | SlackAlertResult
    ) {
        let status: AlertStatus = "FAIL";
        let metadata: Record<string, any> = {};

        if (type === "EMAIL") {
            status = result?.messageId ? "SEND" : "FAIL";
            metadata = {
                success: Boolean(result?.messageId),
                messageId: result?.messageId ?? null,
                accepted: result?.accepted ?? [],
                rejected: result?.rejected ?? [],
                response: result?.response ?? null,
            };
        } else if (type === "SLACK") {
            status = result?.success ? "SEND" : "FAIL";
            metadata = {
                success: Boolean(result?.success),
                attempts: result?.attempts,
                lastError: result?.lastError ?? null,
            };
        }

        await this.prisma.notification.create({
            data: {
                type,
                message,
                status,
                endpointId: endpoint.id,
                metadata,
            },
        });
    }
}
