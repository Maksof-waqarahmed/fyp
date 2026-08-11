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
import { AlertStatus, DNSStatus, HTTPStatus, IncidentStatus } from "../../prisma/generated/prisma/enums";
import { PrismaClient } from "../../prisma/generated/prisma/client";

// PostgreSQL INT4 max. `Incident.downtimeMs` is an Int column, so an incident
// left ongoing for longer than ~24.8 days would overflow it. Clamp to stay in
// range (realistic outages never approach this; a stuck endpoint could).
const MAX_INT4 = 2_147_483_647;
const clampDowntime = (ms: number) => Math.min(Math.max(0, ms), MAX_INT4);

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

        const log = await this.prisma.log.create({
            data: {
                status: httpResult.status as HTTPStatus,
                // Capture the status code whenever one exists — a 5xx is DOWN but
                // still carries statusCode; only network errors lack one.
                httpCode: "statusCode" in httpResult ? (httpResult as EndpointUp).statusCode : null,
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

        return log;
    }

    async upsertIncident(
        endpoint: EndpointRef,
        httpResult: EndPointType,
        log: { id: string; checkedAt: Date }
    ) {
        const isDown = httpResult.status === "DOWN";

        const ongoing = await this.prisma.incident.findFirst({
            where: { endpointId: endpoint.id, status: IncidentStatus.ONGOING },
            orderBy: { startedAt: "desc" },
        });

        if (isDown) {
            if (!ongoing) {
                await this.prisma.incident.create({
                    data: {
                        endpointId: endpoint.id,
                        status: IncidentStatus.ONGOING,
                        startedAt: log.checkedAt,
                        downtimeMs: 0,
                        triggerStatus: httpResult.status as HTTPStatus,
                        triggerLogId: log.id,
                        errorMessage: (httpResult as EndpointDown).reason ?? null,
                        httpCode: "statusCode" in httpResult ? (httpResult as EndpointUp).statusCode : null,
                    },
                });
                console.log(`🆘 New incident opened for ${endpoint.name}`);
            } else {
                const downtimeMs = clampDowntime(log.checkedAt.getTime() - ongoing.startedAt.getTime());
                await this.prisma.incident.update({
                    where: { id: ongoing.id },
                    data: { downtimeMs },
                });
            }
            return;
        }

        if (ongoing) {
            const downtimeMs = log.checkedAt.getTime() - ongoing.startedAt.getTime();
            await this.prisma.incident.update({
                where: { id: ongoing.id },
                data: {
                    status: IncidentStatus.RESOLVED,
                    recoveredAt: log.checkedAt,
                    downtimeMs,
                },
            });
            console.log(`✅ Incident resolved for ${endpoint.name} after ${Math.round(downtimeMs / 1000)}s`);
        }
    }

    async updateEndPoints(
        endpoint: EndpointRef,
        httpResult: EndPointType,
        consecutiveDownCount: number
    ) {
        const now = new Date();
        // 5-minute floor is a deliberate trade-off: Vercel Cron fires every 5 min
        // and each tick has serverless invocation + OpenAI cost. Sub-minute checks
        // would need a dedicated always-on worker / queue (see README → Future Work).
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
        result: SentMessageInfo | null | SlackAlertResult,
        kind: NotificationKind = "DOWN"
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
                kind,
                message,
                status,
                endpointId: endpoint.id,
                metadata,
            },
        });
    }

    async markLogAnomaly(logId: string) {
        await this.prisma.log.update({
            where: { id: logId },
            data: { isAnomaly: true },
        });
    }

    async hasRecentNotification(
        endpointId: string,
        kind: NotificationKind,
        sinceMs: number
    ): Promise<boolean> {
        const since = new Date(Date.now() - sinceMs);
        const count = await this.prisma.notification.count({
            where: {
                endpointId,
                kind,
                sentAt: { gte: since },
                status: "SEND",
            },
        });
        return count > 0;
    }

    // Most recent prior log's content hash (excluding the just-created log),
    // used to detect content changes / defacement between consecutive checks.
    async getPreviousContentHash(
        endpointId: string,
        excludeLogId: string
    ): Promise<string | null> {
        const prev = await this.prisma.log.findFirst({
            where: {
                endpointId,
                id: { not: excludeLogId },
                contentHash: { not: null },
            },
            orderBy: { checkedAt: "desc" },
            select: { contentHash: true },
        });
        return prev?.contentHash ?? null;
    }

    async countTransientFailures(endpointId: string, sinceMs: number): Promise<number> {
        const since = new Date(Date.now() - sinceMs);
        return this.prisma.log.count({
            where: {
                endpointId,
                checkedAt: { gte: since },
                status: { not: "UP" as HTTPStatus },
            },
        });
    }
}

export type NotificationKind =
    | "DOWN"
    | "DEGRADED"
    | "SSL_WARNING"
    | "UNSTABLE"
    | "CONTENT_CHANGED";
