"use client"
import { useLiveDashboard } from "@/hooks/use-live-dashboard"
import Cards from "./cards"
import TerminalComp from "./terminal"
import { UptimeHeatmap } from "./uptime-heatmap"
import type { RouterOutputs } from "@/trpc"
import type { Logs } from "@/types/logs.types"

type AnalysisData = RouterOutputs["dashboardAnalysis"]["getAnalysis"]["data"]
type EndpointHealth = RouterOutputs["dashboardAnalysis"]["getEndpointHealthSummary"]["data"]
type TrendDay = RouterOutputs["dashboardAnalysis"]["getUptimeTrends"]["data"][number]

interface LiveDashboardProps {
    analysis: AnalysisData
    recentLogs: Logs[]
    endpointHealth: EndpointHealth
    uptimeTrends: TrendDay[]
}

export function LiveDashboard({ analysis, recentLogs, endpointHealth, uptimeTrends }: LiveDashboardProps) {
    const live = useLiveDashboard(recentLogs)

    // Overlay live lastStatus onto the SSR endpoint health list
    const mergedEndpointHealth = endpointHealth.map((ep) => {
        const liveEp = live.endpointStatuses.find((s) => s.id === ep.id)
        if (!liveEp) return ep
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...ep, lastStatus: liveEp.lastStatus as any }
    })

    // Overlay live up/down counts onto the SSR analysis
    const mergedAnalysis = live.connected
        ? {
              ...analysis,
              endpoints: {
                  ...analysis.endpoints,
                  active: live.stats.up,
                  down: live.stats.down,
              },
          }
        : analysis

    return (
        <>
            <Cards
                analysis={mergedAnalysis}
                recentLogs={live.recentLogs}
                endpointHealth={mergedEndpointHealth}
                isLive={live.connected}
                lastUpdated={live.lastUpdated}
            />

            <UptimeHeatmap trends={uptimeTrends} days={90} />

            <div className="h-[500px]">
                <TerminalComp
                    data={live.recentLogs}
                    isLive={live.connected}
                    newLogIds={live.newLogIds}
                />
            </div>
        </>
    )
}
