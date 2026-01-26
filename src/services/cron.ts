import cron from "node-cron";
import { getUrlsandRunScript } from "@/lib/main-script";

console.log("Starting monitoring cron...");

cron.schedule("* * * * *", async () => {
    console.log("Running website checks...");
    await getUrlsandRunScript();
});
