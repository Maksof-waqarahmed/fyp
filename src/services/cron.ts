import cron from "node-cron";
import { runEndpointMonitoring } from "./run-monitoring";

cron.schedule("* * * * *", async () => {
    console.log("⏱ Running monitoring job...");
    await runEndpointMonitoring();
});
