import { serverSession } from "@/lib/auth-sever"
import db from "@/lib/prisma"
import { OPENAI } from "@/services/openAI"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

interface ChatMessageInput {
    role: "user" | "assistant"
    content: string
}

async function buildMonitoringContext(userId: string): Promise<string> {
    try {
        const [endpoints, recentIncidents] = await Promise.all([
            db.endpoint.findMany({
                where: { project: { userId }, isDeleted: false },
                select: {
                    name: true,
                    url: true,
                    lastStatus: true,
                    project: { select: { projectName: true } },
                    logs: {
                        orderBy: { checkedAt: "desc" },
                        take: 1,
                        select: { responseTime: true, errorMessage: true },
                    },
                },
            }),
            db.incident.findMany({
                where: {
                    endpoint: { project: { userId } },
                    startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
                orderBy: { startedAt: "desc" },
                take: 5,
                select: {
                    status: true,
                    startedAt: true,
                    downtimeMs: true,
                    errorMessage: true,
                    endpoint: { select: { name: true, url: true } },
                },
            }),
        ])

        const upCount = endpoints.filter((e) => e.lastStatus === "UP").length
        const downCount = endpoints.filter((e) => e.lastStatus !== "UP").length

        const endpointLines = endpoints
            .map((e) => {
                const last = e.logs[0]
                const rt = last?.responseTime ? `${last.responseTime}ms` : "N/A"
                const err = last?.errorMessage ? ` | Error: ${last.errorMessage}` : ""
                return `  - [${e.lastStatus ?? "UNKNOWN"}] ${e.name} (${e.url}) | Response: ${rt}${err} | Project: ${e.project.projectName}`
            })
            .join("\n")

        const incidentLines = recentIncidents.length
            ? recentIncidents
                  .map((i) => {
                      const dt = i.downtimeMs ? `${Math.round(i.downtimeMs / 60000)}min downtime` : "ongoing"
                      const status = i.status === "RESOLVED" ? "Resolved" : "ONGOING"
                      return `  - [${status}] ${i.endpoint.name}: ${i.errorMessage ?? "Unknown error"} | ${dt} | Started: ${new Date(i.startedAt).toLocaleString()}`
                  })
                  .join("\n")
            : "  - No incidents in the last 7 days"

        return `
== LIVE MONITORING CONTEXT ==
Total Endpoints: ${endpoints.length}
Currently UP: ${upCount}
Currently DOWN: ${downCount}

Endpoints:
${endpointLines || "  - No endpoints configured"}

Recent Incidents (last 7 days):
${incidentLines}
== END CONTEXT ==`
    } catch (err) {
        console.error("[Chat] buildMonitoringContext error:", err)
        return "== MONITORING CONTEXT ==\n  - Context unavailable at this time\n== END CONTEXT =="
    }
}

function saveChatMessage(userId: string, role: "user" | "assistant", content: string) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaAny = db as any
        if (typeof prismaAny.chatMessage?.create === "function") {
            prismaAny.chatMessage
                .create({ data: { userId, role, content } })
                .catch((err: unknown) => console.error(`[Chat] save ${role} msg error:`, err))
        }
    } catch {
        // Prisma client not yet regenerated — silently skip
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await serverSession()
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 401 })
        }

        const userId = session.user.id
        const userName = session.user.name ?? "there"

        let body: { message: string; history: ChatMessageInput[] }
        try {
            body = await req.json()
        } catch {
            return new Response("Invalid request body", { status: 400 })
        }

        const userMessage = body.message?.trim()
        if (!userMessage) {
            return new Response("Message is required", { status: 400 })
        }

        // Save user message — defensive, won't crash if chatMessage unavailable
        saveChatMessage(userId, "user", userMessage)

        // Build monitoring context — always succeeds (has internal fallback)
        const context = await buildMonitoringContext(userId)

        const systemPrompt = `You are an intelligent AI assistant embedded in an uptime monitoring application called "Uptime Monitor". You help ${userName} understand and manage their website monitoring data.

${context}

Guidelines:
- Answer questions about the user's endpoints, incidents, and uptime using the context above
- Be concise, clear, and professional — use bullet points when listing multiple items
- For DevOps or monitoring questions without context data, give expert general advice
- Format numbers cleanly (e.g., "99.7% uptime", "2 endpoints down")
- If an endpoint is DOWN, be empathetic and suggest immediate actions
- Keep responses under 300 words unless a detailed explanation is needed
- Never make up data that is not in the context`

        const messages = [
            { role: "system" as const, content: systemPrompt },
            ...(body.history ?? []).slice(-10).map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
            { role: "user" as const, content: userMessage },
        ]

        const encoder = new TextEncoder()
        let fullResponse = ""

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const openaiStream = await OPENAI.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages,
                        temperature: 0.4,
                        max_tokens: 600,
                        stream: true,
                    })

                    for await (const chunk of openaiStream) {
                        const text = chunk.choices[0]?.delta?.content ?? ""
                        if (text) {
                            fullResponse += text
                            controller.enqueue(encoder.encode(text))
                        }
                    }
                } catch (err) {
                    console.error("[Chat] OpenAI stream error:", err)
                    const errMsg = "I encountered an error connecting to the AI. Please try again."
                    controller.enqueue(encoder.encode(errMsg))
                    fullResponse = errMsg
                } finally {
                    controller.close()
                    if (fullResponse) {
                        saveChatMessage(userId, "assistant", fullResponse)
                    }
                }
            },
        })

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        })
    } catch (err) {
        console.error("[Chat] unhandled route error:", err)
        return new Response("Internal server error", { status: 500 })
    }
}
