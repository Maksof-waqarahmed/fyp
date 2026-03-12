"use client"
import { Activity, CheckCircle2, AlertTriangle, Clock, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Area, AreaChart, ResponsiveContainer,
    Bar, BarChart,
    XAxis, YAxis, Tooltip,
} from "recharts"
import type { RouterOutputs } from "@/trpc"

type AnalysisData = RouterOutputs['dashboardAnalysis']['getAnalysis']['data']
type UptimeTrends = RouterOutputs['dashboardAnalysis']['getUptimeTrends']['data']
type ResponseTrends = RouterOutputs['dashboardAnalysis']['getResponseTimeTrends']['data']

interface CardsProps {
    analysis: AnalysisData
    uptimeTrends: UptimeTrends
    responseTrends: ResponseTrends
}

const Cards = ({ analysis, uptimeTrends, responseTrends }: CardsProps) => {
    const weeklyUptimeNum = parseFloat(analysis.uptime.weekly)
    const growth = analysis.endpoints.growth
    const isPositiveGrowth = !growth.startsWith('-')

    const uptimeSparkData = uptimeTrends.map(t => ({ v: t.total }))
    const downSparkData = uptimeTrends.map((t, i) => ({ v: t.down, last: i === uptimeTrends.length - 1 }))
    const responseSparkData = responseTrends.map(t => ({ v: t.avgResponseTime ?? 0 }))

    const uptimeColor = weeklyUptimeNum >= 99 ? '#10b981' : weeklyUptimeNum >= 95 ? '#f59e0b' : '#ef4444'

    const uptimeChartData = uptimeTrends.map(t => ({
        date: t.date.slice(5),
        uptime: parseFloat(t.uptimePercentage),
        up: t.up,
        down: t.down,
    }))

    const responseChartData = responseTrends.map(t => ({
        date: t.date.slice(5),
        avg: t.avgResponseTime ?? 0,
        min: t.minResponseTime ?? 0,
        max: t.maxResponseTime ?? 0,
    }))

    return (
        <div className="space-y-4">
            {/* Row 1: 4 Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {/* Total Endpoints */}
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            Total Endpoints
                        </CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Activity className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-0 px-4">
                        <div className="text-3xl font-bold tracking-tight">{analysis.endpoints.total}</div>
                        <p className={`text-[11px] font-medium mt-0.5 mb-2 flex items-center gap-0.5 ${isPositiveGrowth ? 'text-emerald-500' : 'text-red-500'}`}>
                            <TrendingDown className={`h-3 w-3 ${isPositiveGrowth ? 'rotate-180' : ''}`} />
                            {growth} vs last month
                        </p>
                        <div className="h-[50px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={uptimeSparkData.length ? uptimeSparkData : [{ v: 0 }]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#g1)" strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Uptime */}
                <Card className="border-none shadow-sm rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            Weekly Uptime
                        </CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-4">
                        <div className="text-3xl font-bold tracking-tight">{analysis.uptime.weekly}</div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
                            {analysis.uptime.weeklyChecks.up.toLocaleString()} up &nbsp;·&nbsp; {analysis.uptime.weeklyChecks.down.toLocaleString()} down
                        </p>
                        <div className="space-y-1.5">
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(weeklyUptimeNum, 100)}%`, backgroundColor: uptimeColor }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Down Endpoints */}
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            Down Now
                        </CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-0 px-4">
                        <div className={`text-3xl font-bold tracking-tight ${analysis.endpoints.down > 0 ? 'text-red-500' : ''}`}>
                            {analysis.endpoints.down}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                            of {analysis.endpoints.total} total endpoints
                        </p>
                        <div className="h-[50px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={downSparkData.length ? downSparkData : [{ v: 0, last: true }]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <Bar dataKey="v" radius={[3, 3, 0, 0]} fill="#fecaca" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Avg Response Time */}
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            Avg Response
                        </CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-indigo-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pb-0 px-4">
                        <div className="text-3xl font-bold tracking-tight">
                            {analysis.performance.avgResponseTime != null
                                ? `${analysis.performance.avgResponseTime}ms`
                                : '—'}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                            {analysis.performance.totalLogs.toLocaleString()} total checks
                        </p>
                        <div className="h-[50px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={responseSparkData.length ? responseSparkData : [{ v: 0 }]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="v" stroke="#6366f1" fill="url(#g2)" strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Trend Charts */}
            <div className="grid gap-4 lg:grid-cols-2">

                {/* Uptime Trend */}
                <Card className="border-none shadow-sm rounded-2xl">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">7-Day Uptime Trend</CardTitle>
                            <span className="text-xs text-muted-foreground">% uptime per day</span>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                        <div className="h-[140px]">
                            {uptimeChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={uptimeChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                            formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Uptime']}
                                        />
                                        <Area type="monotone" dataKey="uptime" stroke="#10b981" fill="url(#g3)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                    No data yet
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Response Time Trend */}
                <Card className="border-none shadow-sm rounded-2xl">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">7-Day Response Time</CardTitle>
                            <span className="text-xs text-muted-foreground">avg ms per day</span>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                        <div className="h-[140px]">
                            {responseChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={responseChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                            formatter={(v: number | undefined) => [`${v ?? 0}ms`, 'Avg Response']}
                                        />
                                        <Area type="monotone" dataKey="avg" stroke="#6366f1" fill="url(#g4)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                    No data yet
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Cards
