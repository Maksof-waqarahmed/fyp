import { api } from '@/trpc/trpc-server/server'
import Cards from './cards'
import TerminalComp from './terminal'

const Main = async () => {
    const [analysis, recentLogs, endpointHealth] = await Promise.all([
        api.dashboardAnalysis.getAnalysis(),
        api.logs.getRecentLogs({ limit: 15 }),
        api.dashboardAnalysis.getEndpointHealthSummary(),
    ])

    return (
        <main className="h-full overflow-y-auto px-6 py-5 space-y-4">
            <Cards
                analysis={analysis.data}
                recentLogs={recentLogs.data || []}
                endpointHealth={endpointHealth.data}
            />

            <div className="h-[500px]">
                <TerminalComp data={recentLogs.data || []} />
            </div>
        </main>
    )
}

export default Main
