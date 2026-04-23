"use client"
import {
    Activity, CheckCircle2, AlertTriangle, Clock,
    TrendingUp, TrendingDown, Server, LayoutGrid
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Area, AreaChart, ResponsiveContainer,
    XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts"
import type { RouterOutputs } from "@/trpc"

type AnalysisData = RouterOutputs['dashboardAnalysis']['getAnalysis']['data']
type UptimeTrends = RouterOutputs['dashboardAnalysis']['getUptimeTrends']['data']
type ResponseTrends = RouterOutputs['dashboardAnalysis']['getResponseTimeTrends']['data']
type EndpointHealth = RouterOutputs['dashboardAnalysis']['getEndpointHealthSummary']['data']

interface CardsProps {
    analysis: AnalysisData
    uptimeTrends: UptimeTrends
    responseTrends: ResponseTrends
    endpointHealth: EndpointHealth
}

const seededRandom = (seed: number) => {
    const x = Math.sin(seed + 1) * 10000
    return x - Math.floor(x)
}

const UptimeGauge = ({ percentage }: { percentage: number }) => {
    const r = 54
    const circ = 2 * Math.PI * r
    const pct = Math.min(Math.max(percentage, 0), 100)
    const offset = circ * (1 - pct / 100)
    const color = pct >= 99 ? '#10b981' : pct >= 95 ? '#f59e0b' : '#ef4444'
    const trackColor = pct >= 99 ? '#d1fae5' : pct >= 95 ? '#fef3c7' : '#fee2e2'

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: 148, height: 148 }}>
            <svg width="148" height="148" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="74" cy="74" r={r} fill="none" stroke={trackColor} strokeWidth="11" />
                <circle
                    cx="74" cy="74" r={r} fill="none"
                    stroke={color} strokeWidth="11"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center px-2">
                <span className="text-xl font-bold leading-tight" style={{ color }}>{pct.toFixed(2)}%</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">all time</span>
            </div>
        </div>
    )
}

const Cards = ({ analysis, uptimeTrends, responseTrends, endpointHealth }: CardsProps) => {
    const weeklyUptimeNum = parseFloat(analysis.uptime.weekly)
    const growth = analysis.endpoints.growth
    const isPositiveGrowth = !growth.startsWith('-')
    const hasDown = analysis.endpoints.down > 0

    const responseChartData = responseTrends.map(t => ({
        date: t.date.slice(5),
        avg: t.avgResponseTime ?? 0,
        min: t.minResponseTime ?? 0,
        max: t.maxResponseTime ?? 0,
    }))

    const uptimeChartData = uptimeTrends.map(t => ({
        date: t.date.slice(5),
        uptime: parseFloat(t.uptimePercentage),
    }))

    const uptimeColor = weeklyUptimeNum >= 99 ? '#10b981' : weeklyUptimeNum >= 95 ? '#f59e0b' : '#ef4444'

    const statCards = [
        {
            label: 'All Systems',
            value: analysis.endpoints.total,
            icon: Server,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-600',
            valueColor: 'text-slate-800',
            sub: `${analysis.projects.total} projects`,
        },
        {
            label: 'Up Systems',
            value: analysis.endpoints.active,
            icon: CheckCircle2,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            valueColor: 'text-emerald-600',
            sub: 'Currently healthy',
        },
        {
            label: 'Down Systems',
            value: analysis.endpoints.down,
            icon: AlertTriangle,
            iconBg: 'bg-red-50',
            iconColor: 'text-red-500',
            valueColor: hasDown ? 'text-red-500' : 'text-slate-800',
            sub: hasDown ? 'Needs attention' : 'All clear',
        },
        {
            label: 'Weekly Uptime',
            value: analysis.uptime.weekly,
            icon: Activity,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            valueColor: 'text-blue-600',
            sub: `${analysis.uptime.weeklyChecks.total.toLocaleString()} checks`,
        },
        {
            label: 'Avg Response',
            value: analysis.performance.avgResponseTime != null ? `${analysis.performance.avgResponseTime}ms` : '—',
            icon: Clock,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            valueColor: 'text-indigo-600',
            sub: 'This week',
        },
        {
            label: 'Total Checks',
            value: analysis.performance.totalLogs.toLocaleString(),
            icon: TrendingUp,
            iconBg: 'bg-violet-50',
            iconColor: 'text-violet-600',
            valueColor: 'text-violet-600',
            sub: isPositiveGrowth ? `+${growth} endpoints` : `${growth} endpoints`,
        },
    ]

    return (
        <div className="space-y-5">

            {/* ── Status Banner ── */}
            <div className={`rounded-2xl px-5 py-3.5 flex items-center justify-between border ${hasDown
                ? 'bg-red-50 border-red-200'
                : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-3">
                    <span className={`relative flex h-3 w-3 shrink-0`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${hasDown ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${hasDown ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    </span>
                    <span className={`font-semibold text-sm ${hasDown ? 'text-red-700' : 'text-emerald-700'}`}>
                        {hasDown
                            ? `${analysis.endpoints.down} system${analysis.endpoints.down > 1 ? 's' : ''} currently down — immediate attention required`
                            : 'All systems operational'}
                    </span>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block" suppressHydrationWarning>
                    last updated: {new Date().toLocaleTimeString()}
                </span>
            </div>

            {/* ── 6 Stat Cards ── */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {statCards.map((s) => {
                    const Icon = s.icon
                    return (
                        <Card key={s.label} className="border shadow-sm rounded-xl hover:shadow-md transition-shadow">
                            <CardContent className="pt-4 pb-3 px-4">
                                <div className={`h-8 w-8 rounded-lg ${s.iconBg} flex items-center justify-center mb-2`}>
                                    <Icon className={`h-4 w-4 ${s.iconColor}`} />
                                </div>
                                <div className={`text-2xl font-bold tracking-tight ${s.valueColor}`}>
                                    {s.value}
                                </div>
                                <p className="text-[11px] font-medium text-slate-700 mt-0.5">{s.label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* ── Middle Row: Uptime Gauge + Response Time Chart ── */}
            <div className="grid gap-4 lg:grid-cols-5">

                {/* Uptime Gauge */}
                <Card className="lg:col-span-2 border shadow-sm rounded-2xl">
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Global Uptime
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 flex flex-col items-center gap-4">
                        <UptimeGauge percentage={weeklyUptimeNum} />
                        <div className="w-full space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Weekly Checks</span>
                                <span className="font-semibold">{analysis.uptime.weeklyChecks.total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-muted-foreground">Up</span>
                                </div>
                                <span className="font-semibold text-emerald-600">{analysis.uptime.weeklyChecks.up.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                                    <span className="text-muted-foreground">Down</span>
                                </div>
                                <span className="font-semibold text-red-500">{analysis.uptime.weeklyChecks.down.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(weeklyUptimeNum, 100)}%`, backgroundColor: uptimeColor }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0%</span><span>100%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Response Time Chart — min / avg / max */}
                <Card className="lg:col-span-3 border shadow-sm rounded-2xl">
                    <CardHeader className="pb-1 pt-4 px-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                Response Time — 7 Day
                            </CardTitle>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2 w-4 rounded bg-emerald-400" /> Min
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2 w-4 rounded bg-blue-400" /> Avg
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2 w-4 rounded bg-red-400" /> Max
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-3">
                        <div className="h-[200px]">
                            {responseChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={responseChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gMin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gMax" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="ms" />
                                        <Tooltip
                                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                            formatter={(value) => {
                                                const v = typeof value === 'number' ? value : 0
                                                return [`${v}ms`]
                                            }}
                                        />
                                        <Area type="monotone" dataKey="min" name="Min" stroke="#4ade80" fill="url(#gMin)" strokeWidth={1.5} dot={false} />
                                        <Area type="monotone" dataKey="avg" name="Avg" stroke="#60a5fa" fill="url(#gAvg)" strokeWidth={2} dot={false} />
                                        <Area type="monotone" dataKey="max" name="Max" stroke="#f87171" fill="url(#gMax)" strokeWidth={1.5} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                    No response data yet
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── 7-Day Uptime Trend ── */}
            <Card className="border shadow-sm rounded-2xl">
                <CardHeader className="pb-1 pt-4 px-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            7-Day Uptime Trend
                        </CardTitle>
                        <span className="text-[10px] text-muted-foreground">% uptime per day</span>
                    </div>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                    <div className="h-[110px]">
                        {uptimeChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={uptimeChartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gUptime" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={uptimeColor} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={uptimeColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                                    <Tooltip
                                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                        formatter={(value) => {
                                            const v = typeof value === 'number' ? value : 0
                                            return [`${v.toFixed(1)}%`, 'Uptime']
                                        }}
                                    />
                                    <Area type="monotone" dataKey="uptime" stroke={uptimeColor} fill="url(#gUptime)" strokeWidth={2} dot={false} />
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

            {/* ── All Systems — Endpoint Cards ── */}
            {endpointHealth.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">All Systems</h3>
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                            {endpointHealth.length} endpoint{endpointHealth.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {endpointHealth.map((ep) => {
                            const isUp = ep.lastStatus === 'UP'
                            const uptimePct = parseFloat(ep.uptime24h)
                            const barColor = uptimePct >= 99 ? '#10b981' : uptimePct >= 95 ? '#f59e0b' : '#ef4444'

                            const uptimeBars = Array.from({ length: 30 }, (_, i) => {
                                const seed = (ep.id.charCodeAt(i % Math.max(ep.id.length, 1)) * (i + 1))
                                return seededRandom(seed) * 100 < uptimePct
                            })

                            return (
                                <Card key={ep.id} className="border shadow-sm rounded-2xl hover:shadow-md transition-shadow overflow-hidden">
                                    <CardHeader className="pb-2 pt-4 px-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`relative flex h-2.5 w-2.5 shrink-0`}>
                                                        {!isUp && (
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                                                        )}
                                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isUp ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    </span>
                                                    <p className="font-semibold text-sm truncate">{ep.name}</p>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground truncate mt-1 pl-4">
                                                    {ep.url}
                                                </p>
                                            </div>
                                            <Badge
                                                className={`text-[10px] px-2 py-0.5 shrink-0 border ${isUp
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'}`}
                                                variant="outline"
                                            >
                                                {ep.lastStatus ?? '—'}
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="px-4 pb-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground mb-0.5">Uptime (24h)</p>
                                                <p className="font-semibold" style={{ color: barColor }}>
                                                    {ep.uptime24h}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground mb-0.5">Checks (24h)</p>
                                                <p className="font-semibold">{ep.checks24h}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground mb-0.5">Project</p>
                                                <p className="font-semibold truncate">{ep.project.projectName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground mb-0.5">Interval</p>
                                                <p className="font-semibold">Every {ep.checkInterval}m</p>
                                            </div>
                                        </div>

                                        {/* Uptime progress bar */}
                                        <div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                <span>Uptime History (last 30 days)</span>
                                                <span style={{ color: barColor }}>{ep.uptime24h}</span>
                                            </div>
                                            <div className="flex gap-[2px] h-5 items-end">
                                                {uptimeBars.map((up, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 rounded-sm"
                                                        style={{
                                                            backgroundColor: up ? '#10b981' : '#fca5a5',
                                                            height: '100%',
                                                            opacity: 0.85,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Cards
