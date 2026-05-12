import { serverSession } from "@/lib/auth-sever"
import db from "@/lib/prisma"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

async function fetchLiveData(userId: string) {
    const [recentLogs, endpoints] = await Promise.all([
        db.log.findMany({
            where: { endpoint: { project: { userId } } },
            orderBy: { checkedAt: "desc" },
            take: 15,
            select: {
                id: true,
                status: true,
                httpCode: true,
                responseTime: true,
                errorMessage: true,
                checkedAt: true,
                dnsStatus: true,
                sslValid: true,
                endpoint: {
                    select: { name: true, url: true },
                },
            },
        }),
        db.endpoint.findMany({
            where: { project: { userId } },
            select: { id: true, lastStatus: true },
        }),
    ])

    const downCount = endpoints.filter((e) => e.lastStatus !== "UP").length
    const upCount = endpoints.filter((e) => e.lastStatus === "UP").length

    return {
        recentLogs,
        endpointStatuses: endpoints,
        stats: { up: upCount, down: downCount },
    }
}

export async function GET(req: NextRequest) {
    const session = await serverSession()

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 })
    }

    const userId = session.user.id
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            const enqueue = (event: string, data: unknown) => {
                try {
                    controller.enqueue(
                        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
                    )
                } catch {
                    // stream already closed
                }
            }

            // Send data immediately on connect
            try {
                enqueue("update", await fetchLiveData(userId))
            } catch (err) {
                console.error("[SSE] initial fetch error:", err)
            }

            // Refresh every 30 seconds
            const updateInterval = setInterval(async () => {
                try {
                    enqueue("update", await fetchLiveData(userId))
                } catch (err) {
                    console.error("[SSE] update error:", err)
                }
            }, 30_000)

            // Heartbeat every 15 s to prevent proxy / load-balancer timeouts
            const heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(": heartbeat\n\n"))
                } catch {
                    // stream already closed
                }
            }, 15_000)

            req.signal.addEventListener("abort", () => {
                clearInterval(updateInterval)
                clearInterval(heartbeatInterval)
                try { controller.close() } catch { /* already closed */ }
            })
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    })
}
