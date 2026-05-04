import { sendEmailAlert, sendSlackAlert } from "@/services/alert-services";
import { MonitoringService } from "@/lib/monitoring-service";
import { decrypt } from "@/lib/enc-dec";
import prisma from "@/lib/prisma";
import { checkDNS, checkEndpoint, checkSSL, getContentHash } from "@/lib/log-script";
import { generateAlert } from "@/services/openAI";

// Anti-spam: alert on the 1st DOWN, stay silent for the next 3 consecutive DOWN
// checks, then alert again on the 4th — and reset the cycle. UP resets to 0.
const SILENT_CHECKS_BETWEEN_ALERTS = 3;

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

                const hasSlack = !!setting?.slackWebhook && !!setting.slackWebhookIv && !!setting.slackWebhookAuthTag;
                const slackWebhook = hasSlack ? decrypt(setting.slackWebhook!, setting.slackWebhookIv!, setting.slackWebhookAuthTag!) : null;

                if (isDown) {
                    console.log(`🔴 ${endpoint.url} is DOWN (count=${newDownCount}, alert=${shouldAlert})`);

                    if (!shouldAlert) {
                        console.log(`🔕 Suppressing alert for ${endpoint.name} — within silent window`);
                        continue;
                    }

                    // Only send alerts if notifications are enabled (isActive = true)
                    const isNotificationsEnabled = setting?.isActive ?? true;

                    if (isNotificationsEnabled) {
                        // Generate AI-powered detailed alert message
                        const aiAlertMessage = await generateAlert({
                            status: "DOWN",
                            httpCode: httpResult.status === "DOWN" ? null : (httpResult as any).statusCode,
                            responseTime: httpResult.responseTime ?? null,
                            errorMessage: httpResult.status === "DOWN" ? (httpResult as any).reason : null,
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
                        });

                        const alertMessage = aiAlertMessage || `🔴 ${endpoint.name} (${endpoint.url}) is DOWN`;

                        if (setting?.email) {
                            const emailSubject = `🚨 Alert: ${endpoint.name} is DOWN - ${endpoint.project.projectName}`;
                            const emailResult = await sendEmailAlert(setting.email, alertMessage, emailSubject);
                            await monitoringService.createNotification("EMAIL", alertMessage, endpoint, emailResult);
                            console.log(`✅ Email alert sent to ${setting.email}`);
                        } else {
                            console.log(`⚠️  No email configured for user ${endpoint.project.user.email}`);
                        }

                        if (hasSlack && slackWebhook) {
                            const slackResult = await sendSlackAlert(slackWebhook, alertMessage);
                            await monitoringService.createNotification("SLACK", alertMessage, endpoint, slackResult);
                            console.log(`✅ Slack alert sent`);
                        } else {
                            console.log(`⚠️  No Slack webhook configured`);
                        }
                    } else {
                        console.log(`⚠️  Notifications are disabled for user ${endpoint.project.user.email}`);
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
