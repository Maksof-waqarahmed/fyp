import { ServerSession, serverSession } from '@/lib/auth-sever'
import { api } from '@/trpc/trpc-server/server'
import { Mail } from 'lucide-react'
import Image from 'next/image'
import Cards from './cards'
import TerminalComp from './terminal'
import { Badge } from '@/components/ui/badge'

const Main = async () => {
    const session: ServerSession = await serverSession()
    const userName = session?.user.name || "Guest"
    const profile = session?.user.image
    const userEmail = session?.user.email

    const [analysis, uptimeTrends, responseTrends, recentLogs, endpointHealth] = await Promise.all([
        api.dashboardAnalysis.getAnalysis(),
        api.dashboardAnalysis.getUptimeTrends({ days: 7 }),
        api.dashboardAnalysis.getResponseTimeTrends({ days: 7 }),
        api.logs.getRecentLogs({ limit: 15 }),
        api.dashboardAnalysis.getEndpointHealthSummary(),
    ])

    return (
        <main className="h-full overflow-y-auto px-6 py-6 space-y-5">

            {/* User Header */}
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                    <Image
                        src={profile || '/default-avatar.png'}
                        alt="profile"
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold tracking-tight truncate">{userName}</h2>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{userEmail}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={analysis.data.endpoints.down > 0 ? "destructive" : "secondary"} className="text-xs">
                        {analysis.data.endpoints.down > 0
                            ? `${analysis.data.endpoints.down} Down`
                            : "All Healthy"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {analysis.data.projects.total} Projects
                    </Badge>
                </div>
            </div>

            {/* Main Dashboard Cards */}
            <Cards
                analysis={analysis.data}
                uptimeTrends={uptimeTrends.data}
                responseTrends={responseTrends.data}
                endpointHealth={endpointHealth.data}
            />

            {/* Live Logs Terminal — full width */}
            <div className="h-[280px]">
                <TerminalComp data={recentLogs.data || []} />
            </div>
        </main>
    )
}

export default Main
