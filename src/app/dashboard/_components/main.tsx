import { api } from '@/trpc/trpc-server/server'
import { LiveDashboard } from './live-dashboard'

const Main = async () => {
    const [analysis, recentLogs, endpointHealth, uptimeTrends] = await Promise.all([
        api.dashboardAnalysis.getAnalysis(),
        api.logs.getRecentLogs({ limit: 15 }),
        api.dashboardAnalysis.getEndpointHealthSummary(),
        api.dashboardAnalysis.getUptimeTrends({ days: 90 }),
    ])

    return (
        <main className="h-full overflow-y-auto px-6 py-5 space-y-4">
            <LiveDashboard
                analysis={analysis.data}
                recentLogs={recentLogs.data || []}
                endpointHealth={endpointHealth.data}
                uptimeTrends={uptimeTrends.data}
            />
        </main>
    )
}

export default Main
