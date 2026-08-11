// Dev/demo helper — run ONE monitoring pass immediately (no 5-minute wait).
//
// It first forces every active endpoint to be "due now" (newly-added endpoints
// otherwise won't be checked for 5 min), runs a full monitoring pass, then a
// security-scan pass. Perfect for a live demo.
//
//   pnpm demo:check
import prisma from "@/lib/prisma";
import { runEndpointMonitoring } from "./run-monitoring";
import { runDueSecurityScans } from "./security-scan-service";

async function main() {
    const due = await prisma.endpoint.updateMany({
        where: { isDeleted: false },
        data: { nextCheckAt: new Date() },
    });
    console.log(`⏱  Marked ${due.count} endpoint(s) due. Running one monitoring pass...`);

    await runEndpointMonitoring();

    console.log("🛡️  Running due security scans...");
    await runDueSecurityScans();

    console.log("✅ Done — refresh the dashboard.");
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error("❌ demo:check failed:", e);
    process.exit(1);
});
