// Local-dev-only scheduler. In production, monitoring runs via Vercel Cron
// hitting /api/cron/run on the schedule defined in vercel.json.
// Start manually with `pnpm cron`.
import cron from "node-cron";
import { runEndpointMonitoring } from "./run-monitoring";

if (process.env.NODE_ENV === "production") {
    console.warn(
        "⚠️  services/cron.ts started in production. Monitoring should be triggered via Vercel Cron at /api/cron/run instead."
    );
}

cron.schedule("*/5 * * * *", async () => {
    console.log("⏱ [local-dev] Running monitoring job...");
    await runEndpointMonitoring();
});

console.log("🕒 Local cron scheduler started (every 5 min). Use Ctrl+C to stop.");
