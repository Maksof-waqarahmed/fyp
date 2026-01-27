import { sendEmailAlert, sendSlackAlert } from "@/services/alert-services";
import { MonitoringService } from "@/lib/monitoring-service";
import { decrypt } from "@/lib/enc-dec";
import prisma from "@/lib/prisma";
import { checkDNS, checkEndpoint, checkSSL, getContentHash } from "@/lib/log-script";

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

                await monitoringService.createLogs(dnsResult, sslResult, httpResult, contentResult, endpoint);
                await monitoringService.updateEndPoints(endpoint, httpResult);

                const setting = await monitoringService.getAlertData(endpoint);
                if (!setting) continue;

                const hasSlack = !!setting.slackWebhook && !!setting.slackWebhookIv && !!setting.slackWebhookAuthTag;
                const slackWebhook = hasSlack ? decrypt(setting.slackWebhook!, setting.slackWebhookIv!, setting.slackWebhookAuthTag!) : null;

                if (httpResult.status === "DOWN") {
                    console.log(`🔴 ${endpoint.url} is DOWN — sending alerts`);

                    if (setting.email) {
                        const emailResult = await sendEmailAlert(setting.email, `🔴 ${endpoint.url} is DOWN`);
                        await monitoringService.createNotification("EMAIL", `🔴 ${endpoint.url} is DOWN`, endpoint, emailResult);
                    }

                    if (hasSlack && slackWebhook) {
                        const slackResult = await sendSlackAlert(slackWebhook, `🔴 ${endpoint.url} is DOWN`);
                        await monitoringService.createNotification("SLACK", `🔴 ${endpoint.url} is DOWN`, endpoint, slackResult);
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
