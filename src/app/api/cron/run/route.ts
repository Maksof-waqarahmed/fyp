import { runEndpointMonitoring } from "@/services/run-monitoring";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    const expected = process.env.CRON_SECRET;

    if (!expected) {
        return NextResponse.json(
            { error: "CRON_SECRET is not configured on the server" },
            { status: 500 }
        );
    }

    if (authHeader !== `Bearer ${expected}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startedAt = Date.now();

    try {
        await runEndpointMonitoring();
        return NextResponse.json({
            ok: true,
            durationMs: Date.now() - startedAt,
        });
    } catch (error) {
        console.error("❌ Cron run failed:", error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
