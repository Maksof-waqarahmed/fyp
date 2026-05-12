"use client"
import { useEffect, useRef, useState } from "react"
import type { Logs } from "@/types/logs.types"

interface EndpointStatus {
    id: string
    lastStatus: string
}

interface LiveStats {
    up: number
    down: number
}

export interface LiveDashboardState {
    recentLogs: Logs[]
    endpointStatuses: EndpointStatus[]
    stats: LiveStats
    connected: boolean
    lastUpdated: Date | null
    newLogIds: Set<string>
}

export function useLiveDashboard(initialLogs: Logs[]): LiveDashboardState {
    const [state, setState] = useState<LiveDashboardState>({
        recentLogs: initialLogs,
        endpointStatuses: [],
        stats: { up: 0, down: 0 },
        connected: false,
        lastUpdated: null,
        newLogIds: new Set(),
    })

    const prevLogIdsRef = useRef<Set<string>>(new Set(initialLogs.map((l) => l.id)))

    useEffect(() => {
        const es = new EventSource("/api/sse/dashboard")

        es.onopen = () => {
            setState((prev) => ({ ...prev, connected: true }))
        }

        es.onerror = () => {
            setState((prev) => ({ ...prev, connected: false }))
        }

        es.addEventListener("update", (e: MessageEvent) => {
            try {
                const raw = JSON.parse(e.data as string) as {
                    recentLogs: Array<{
                        id: string
                        status: string
                        httpCode: number | null
                        responseTime: number | null
                        errorMessage: string | null
                        checkedAt: string
                        dnsStatus: string
                        sslValid: boolean
                        endpoint: { name: string; url: string } | null
                    }>
                    endpointStatuses: EndpointStatus[]
                    stats: LiveStats
                }

                // Normalize checkedAt from ISO string → Date
                const logs: Logs[] = raw.recentLogs.map((l) => ({
                    ...l,
                    checkedAt: new Date(l.checkedAt),
                }))

                // Detect truly new log IDs
                const freshIds = new Set<string>()
                logs.forEach((l) => {
                    if (!prevLogIdsRef.current.has(l.id)) freshIds.add(l.id)
                })
                prevLogIdsRef.current = new Set(logs.map((l) => l.id))

                setState({
                    recentLogs: logs,
                    endpointStatuses: raw.endpointStatuses,
                    stats: raw.stats,
                    connected: true,
                    lastUpdated: new Date(),
                    newLogIds: freshIds,
                })

                // Clear flash highlight after 3 seconds
                if (freshIds.size > 0) {
                    setTimeout(() => {
                        setState((prev) => ({ ...prev, newLogIds: new Set() }))
                    }, 3000)
                }
            } catch {
                // ignore parse errors
            }
        })

        return () => {
            es.close()
        }
    }, [])

    return state
}
