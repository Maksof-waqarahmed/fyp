import { api } from '@/trpc/trpc-server/server'
import { LiveDashboard } from './live-dashboard'

const Main = async () => {
    const [analysis, recentLogs, endpointHealth] = await Promise.all([
        api.dashboardAnalysis.getAnalysis(),
        api.logs.getRecentLogs({ limit: 15 }),
        api.dashboardAnalysis.getEndpointHealthSummary(),
    ])

    return (
        <main className="h-full overflow-y-auto px-6 py-5 space-y-4">
            <LiveDashboard
                analysis={analysis.data}
                recentLogs={recentLogs.data || []}
                endpointHealth={endpointHealth.data}
            />
        </main>
    )
}

export default Main
