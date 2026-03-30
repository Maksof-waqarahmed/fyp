import cron from "node-cron";
import { runEndpointMonitoring } from "./run-monitoring";

// Run every 5 minutes (for production, you can change to "0 * * * *" for hourly)
cron.schedule("*/5 * * * *", async () => {
    console.log("⏱ Running monitoring job...");
    await runEndpointMonitoring();
});
