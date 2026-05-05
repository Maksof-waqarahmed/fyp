import { sendEmailAlert, sendSlackAlert } from "@/services/alert-services";
import {
    EndpointRef,
    MonitoringService,
    NotificationKind,
} from "@/lib/monitoring-service";
import { decrypt } from "@/lib/enc-dec";
import prisma from "@/lib/prisma";
import { checkDNS, checkEndpoint, checkSSL, getContentHash } from "@/lib/log-script";
import { generateAlert } from "@/services/openAI";
import { detectResponseTimeAnomaly } from "@/lib/anomaly-detector";

// Anti-spam: alert on the 1st DOWN, stay silent for the next 3 consecutive DOWN
// checks, then alert again on the 4th — and reset the cycle. UP resets to 0.
const SILENT_CHECKS_BETWEEN_ALERTS = 3;

const SSL_WARNING_DAYS = 14;
const UNSTABLE_FAILURE_THRESHOLD = 5;
const UNSTABLE_WINDOW_MS = 24 * 60 * 60 * 1000;

const SSL_THROTTLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const UNSTABLE_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEGRADED_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

type DispatchTarget = {
    email: string | null;
    slackWebhook: string | null;
};

async function dispatch(
    monitoringService: MonitoringService,
    endpoint: EndpointRef,
    target: DispatchTarget,
    kind: NotificationKind,
    subject: string,
    message: string
) {
    if (target.email) {
        const emailResult = await sendEmailAlert(target.email, message, subject);
        await monitoringService.createNotification("EMAIL", message, endpoint, emailResult, kind);
        console.log(`📧 [${kind}] email sent to ${target.email}`);
    }
    if (target.slackWebhook) {
        const slackResult = await sendSlackAlert(target.slackWebhook, message);
        await monitoringService.createNotification("SLACK", message, endpoint, slackResult, kind);
        console.log(`💬 [${kind}] slack sent`);
    }
}

export async function runEndpointMonitoring() {
    try {
        const monitoringService = new MonitoringService(prisma);
        const endpoints = await monitoringService.getEndPoints();

        for (const endpoint of endpoints) {
            try {
                const hostname = new URL(endpoint.url).hostname;

                const [dnsResult, sslResult, httpResult, contentResult] = await Promise.all([
                    checkDNS(hostname),
                    checkSSL(hostname),
                    checkEndpoint(endpoint.url),
                    getContentHash(endpoint.url),
                ]);

                const isDown = httpResult.status === "DOWN";

                let newDownCount = endpoint.consecutiveDownCount;
                let shouldAlert = false;

                if (isDown) {
                    newDownCount = endpoint.consecutiveDownCount + 1;
                    if (newDownCount === 1) {
                        shouldAlert = true;
                    } else if (newDownCount > SILENT_CHECKS_BETWEEN_ALERTS + 1) {
                        shouldAlert = true;
                        newDownCount = 1;
                    }
                } else {
                    newDownCount = 0;
                }

                const log = await monitoringService.createLogs(dnsResult, sslResult, httpResult, contentResult, endpoint);
                await monitoringService.updateEndPoints(endpoint, httpResult, newDownCount);
                await monitoringService.upsertIncident(endpoint, httpResult, log);

                const setting = endpoint.project.user.setting;
                const isNotificationsEnabled = setting?.isActive ?? false;
                const hasSlack = !!setting?.slackWebhook && !!setting.slackWebhookIv && !!setting.slackWebhookAuthTag;
                const slackWebhook = hasSlack
                    ? decrypt(setting!.slackWebhook!, setting!.slackWebhookIv!, setting!.slackWebhookAuthTag!)
                    : null;
                const target: DispatchTarget = {
                    email: setting?.email ?? null,
                    slackWebhook,
                };

                // ── 1) DOWN alerts (with anti-spam counter) ───────────────────
                if (isDown) {
                    console.log(`🔴 ${endpoint.url} is DOWN (count=${newDownCount}, alert=${shouldAlert})`);

                    if (shouldAlert && isNotificationsEnabled) {
                        const aiAlertMessage = await generateAlert(
                            {
                                status: "DOWN",
                                httpCode: null,
                                responseTime: httpResult.responseTime ?? null,
                                errorMessage: (httpResult as any).reason ?? null,
                                dnsStatus: dnsResult.dnsStatus,
                                ip: dnsResult.ip,
                                sslValid: sslResult.sslValid,
                                sslExpiry: sslResult.sslExpiry ?? null,
                                checkedAt: new Date().toISOString(),
                                contentHash: contentResult.hash,
                                contentLength: contentResult.length || null,
                                userName: endpoint.project.user.name,
                                projectName: endpoint.project.projectName,
                                endpointName: endpoint.name,
                                endpointUrl: endpoint.url,
                            },
                            { endpointId: endpoint.id, userId: endpoint.project.user.id, prisma }
                        );

                        const alertMessage = aiAlertMessage || `🔴 ${endpoint.name} (${endpoint.url}) is DOWN`;
                        const subject = `🚨 Alert: ${endpoint.name} is DOWN - ${endpoint.project.projectName}`;
                        await dispatch(monitoringService, endpoint, target, "DOWN", subject, alertMessage);
                    }

                    // skip anomaly + predictive checks while DOWN — they're not meaningful
                    continue;
                }

                // ── 2) Anomaly detection (UP only — slow response) ────────────
                if (httpResult.status === "UP" && httpResult.responseTime !== null) {
                    const anomaly = await detectResponseTimeAnomaly(
                        prisma,
                        endpoint.id,
                        httpResult.responseTime
                    );

                    if (anomaly.isAnomaly && anomaly.baseline) {
                        await monitoringService.markLogAnomaly(log.id);
                        console.log(
                            `📈 Anomaly: ${endpoint.name} ${httpResult.responseTime}ms vs baseline ${anomaly.baseline.mean}±${anomaly.baseline.stddev} (z=${anomaly.zScore})`
                        );

                        if (isNotificationsEnabled) {
                            const recentlyNotified = await monitoringService.hasRecentNotification(
                                endpoint.id,
                                "DEGRADED",
                                DEGRADED_THROTTLE_MS
                            );
                            if (!recentlyNotified) {
                                const message =
                                    `👋 Hello ${endpoint.project.user.name},\n\n` +
                                    `⚠️ *Performance Degraded* on your project *${endpoint.project.projectName}*.\n\n` +
                                    `🔗 *Endpoint:* ${endpoint.name}\n` +
                                    `*URL:* ${endpoint.url}\n\n` +
                                    `*Current response time:* ${httpResult.responseTime}ms\n` +
                                    `*7-day baseline:* ${anomaly.baseline.mean}ms ± ${anomaly.baseline.stddev}ms (n=${anomaly.baseline.sampleSize} samples)\n` +
                                    `*Z-score:* ${anomaly.zScore} (anomaly threshold: 2.0)\n` +
                                    `*Checked at:* ${new Date().toLocaleString()}\n\n` +
                                    `💡 *Suggestions:*\n` +
                                    `- Check server CPU / memory / DB load\n` +
                                    `- Look for recent deploys that could have changed performance\n` +
                                    `- If this persists, expect a full outage soon\n\n` +
                                    `Thanks for staying on top of things!\n*Your Monitoring Team*`;
                                const subject = `⚠️ Performance degraded: ${endpoint.name} (${endpoint.project.projectName})`;
                                await dispatch(monitoringService, endpoint, target, "DEGRADED", subject, message);
                            }
                        }
                    }
                }

                // ── 3) SSL expiry warning ─────────────────────────────────────
                if (sslResult.sslValid && sslResult.sslExpiry) {
                    const expiryDate = new Date(sslResult.sslExpiry);
                    const daysToExpiry = Math.floor(
                        (expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                    );

                    if (daysToExpiry >= 0 && daysToExpiry < SSL_WARNING_DAYS && isNotificationsEnabled) {
                        const recentlyNotified = await monitoringService.hasRecentNotification(
                            endpoint.id,
                            "SSL_WARNING",
                            SSL_THROTTLE_MS
                        );
                        if (!recentlyNotified) {
                            const dayLabel = daysToExpiry === 1 ? "day" : "days";
                            const urgencyEmoji = daysToExpiry <= 3 ? "🚨" : daysToExpiry <= 7 ? "⚠️" : "🔒";
                            const message =
                                `👋 Hello ${endpoint.project.user.name},\n\n` +
                                `${urgencyEmoji} *SSL Certificate Expiring Soon* on your project *${endpoint.project.projectName}*.\n\n` +
                                `🔗 *Endpoint:* ${endpoint.name}\n` +
                                `*URL:* ${endpoint.url}\n\n` +
                                `*Expires in:* ${daysToExpiry} ${dayLabel}\n` +
                                `*Expiry date:* ${expiryDate.toLocaleString()}\n` +
                                `*Checked at:* ${new Date().toLocaleString()}\n\n` +
                                `💡 *Suggestions:*\n` +
                                `- Renew the certificate before it expires\n` +
                                `- If using Let's Encrypt, verify the auto-renew cron job is running\n` +
                                `- If the cert is managed by your hosting provider, check renewal status in their dashboard\n` +
                                `- Test renewed cert with: \`curl -vI ${endpoint.url}\`\n\n` +
                                `Thanks for staying on top of things!\n*Your Monitoring Team*`;
                            const subject = `${urgencyEmoji} SSL expires in ${daysToExpiry} ${dayLabel}: ${endpoint.name} (${endpoint.project.projectName})`;
                            await dispatch(monitoringService, endpoint, target, "SSL_WARNING", subject, message);
                        }
                    }
                }

                // ── 4) Unstable endpoint warning ──────────────────────────────
                const failures24h = await monitoringService.countTransientFailures(
                    endpoint.id,
                    UNSTABLE_WINDOW_MS
                );
                if (failures24h > UNSTABLE_FAILURE_THRESHOLD && isNotificationsEnabled) {
                    const recentlyNotified = await monitoringService.hasRecentNotification(
                        endpoint.id,
                        "UNSTABLE",
                        UNSTABLE_THROTTLE_MS
                    );
                    if (!recentlyNotified) {
                        const message =
                            `👋 Hello ${endpoint.project.user.name},\n\n` +
                            `📉 *Endpoint Unstable* on your project *${endpoint.project.projectName}*.\n\n` +
                            `🔗 *Endpoint:* ${endpoint.name}\n` +
                            `*URL:* ${endpoint.url}\n\n` +
                            `*Last 24 hours:* ${failures24h} non-UP checks detected (threshold: ${UNSTABLE_FAILURE_THRESHOLD})\n` +
                            `*Pattern:* Endpoint is flapping between UP and failure states\n` +
                            `*Checked at:* ${new Date().toLocaleString()}\n\n` +
                            `💡 *Suggestions:*\n` +
                            `- Check intermittent network or DNS issues\n` +
                            `- Review recent deploys / config changes\n` +
                            `- Verify backend health (CPU, memory, DB connection pool)\n` +
                            `- Look at logs around the failure timestamps for patterns\n\n` +
                            `Thanks for staying on top of things!\n*Your Monitoring Team*`;
                        const subject = `📉 Endpoint unstable: ${endpoint.name} (${endpoint.project.projectName})`;
                        await dispatch(monitoringService, endpoint, target, "UNSTABLE", subject, message);
                    }
                }
            } catch (endpointError) {
                console.error(`❌ Error processing endpoint ${endpoint.url}:`, endpointError);
            }
        }
    } catch (error) {
        console.error("❌ Critical error running monitoring:", error);
    }
}
