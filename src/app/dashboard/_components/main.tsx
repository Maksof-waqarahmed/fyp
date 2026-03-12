import { ServerSession, serverSession } from '@/lib/auth-sever'
import { api } from '@/trpc/trpc-server/server'
import { AlertTriangle, Clock, Mail } from 'lucide-react'
import Image from 'next/image'
import Cards from './cards'
import TerminalComp from './terminal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const Main = async () => {
    const session: ServerSession = await serverSession()
    const userName = session?.user.name || "Guest"
    const profile = session?.user.image
    const userEmail = session?.user.email

    const [analysis, uptimeTrends, responseTrends, recentLogs] = await Promise.all([
        api.dashboardAnalysis.getAnalysis(),
        api.dashboardAnalysis.getUptimeTrends({ days: 7 }),
        api.dashboardAnalysis.getResponseTimeTrends({ days: 7 }),
        api.logs.getRecentLogs({ limit: 5 }),
    ])

    const downEndpoints = analysis.data.alerts.recentDownEndpoints
    const upcomingChecks = analysis.data.alerts.upcomingChecks

    return (
        <main className="h-full overflow-y-auto px-6 py-6 space-y-6">

            {/* User Header */}
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                    <Image
                        src={profile || '/default-avatar.png'}
                        alt="profile"
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight truncate">{userName}</h2>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{userEmail}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                    <Badge variant={analysis.data.endpoints.down > 0 ? "destructive" : "secondary"}>
                        {analysis.data.endpoints.down > 0
                            ? `${analysis.data.endpoints.down} Down`
                            : "All Healthy"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {analysis.data.projects.total} Projects
                    </Badge>
                </div>
            </div>

            {/* Stat Cards + Trend Charts */}
            <Cards
                analysis={analysis.data}
                uptimeTrends={uptimeTrends.data}
                responseTrends={responseTrends.data}
            />

            {/* Bottom Row: Alerts + Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Down Endpoints + Upcoming Checks */}
                <div className="space-y-4">

                    {/* Down Endpoints */}
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardHeader className="pb-3 pt-4 px-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <div className="h-6 w-6 rounded-md bg-red-50 flex items-center justify-center">
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                </div>
                                Down Endpoints
                                {downEndpoints.length > 0 && (
                                    <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                                        {downEndpoints.length}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                            {downEndpoints.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    All endpoints are healthy ✓
                                </p>
                            ) : downEndpoints.map((ep) => (
                                <div
                                    key={ep.id}
                                    className="flex items-start justify-between p-3 rounded-xl bg-red-50/60 border border-red-100"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{ep.name}</p>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{ep.url}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {ep.project.projectName}
                                        </p>
                                    </div>
                                    <div className="text-right ml-3 shrink-0">
                                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">DOWN</Badge>
                                        {ep.lastCheckedAt && (
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {new Date(ep.lastCheckedAt).toLocaleTimeString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Upcoming Checks */}
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardHeader className="pb-3 pt-4 px-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <div className="h-6 w-6 rounded-md bg-indigo-50 flex items-center justify-center">
                                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                </div>
                                Upcoming Checks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                            {upcomingChecks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No scheduled checks
                                </p>
                            ) : upcomingChecks.map((ep) => (
                                <div
                                    key={ep.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{ep.name}</p>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{ep.url}</p>
                                    </div>
                                    <div className="text-right ml-3 shrink-0">
                                        <p className="text-xs font-medium text-indigo-600">
                                            {ep.nextCheckAt
                                                ? new Date(ep.nextCheckAt).toLocaleTimeString()
                                                : '—'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            every {ep.checkInterval}m
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Live Logs Terminal */}
                <TerminalComp data={recentLogs.data || []} />
            </div>
        </main>
    )
}

export default Main
