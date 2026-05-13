"use client"
import Link from "next/link"
import { Server, ArrowRight, Activity, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Area, AreaChart, ResponsiveContainer,
    XAxis, YAxis, Tooltip,
} from "recharts"
import type { RouterOutputs } from "@/trpc"

type AnalysisData = RouterOutputs['dashboardAnalysis']['getAnalysis']['data']
type EndpointHealth = RouterOutputs['dashboardAnalysis']['getEndpointHealthSummary']['data']

type LogPoint = {
    id: string
    status: string
    responseTime: number | null
    checkedAt: Date | string
}

interface CardsProps {
    analysis: AnalysisData
    recentLogs: LogPoint[]
    endpointHealth: EndpointHealth
    isLive?: boolean
    lastUpdated?: Date | null
}

const ENDPOINT_VISIBLE_LIMIT = 8

const Cards = ({ analysis, recentLogs, endpointHealth, isLive, lastUpdated }: CardsProps) => {
    const weeklyUptimeNum = parseFloat(analysis.uptime.weekly)
    const hasDown = analysis.endpoints.down > 0
    const uptimeColor = weeklyUptimeNum >= 99 ? '#10b981' : weeklyUptimeNum >= 95 ? '#f59e0b' : '#ef4444'

    // Build chart from real-time recent logs (oldest → newest)
    const chartData = [...recentLogs]
        .reverse()
        .filter(l => l.responseTime !== null)
        .map((log, i) => ({
            idx: i,
            time: new Date(log.checkedAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: false,
            }),
            ms: log.responseTime ?? 0,
            status: log.status,
        }))

    const hasChart = chartData.length >= 2
    const slowest = chartData.length ? Math.max(...chartData.map(d => d.ms)) : 0
    const fastest = chartData.length ? Math.min(...chartData.map(d => d.ms)) : 0

    // Sort endpoints: DOWN first, then by uptime asc (problems first)
    const sortedEndpoints = [...endpointHealth].sort((a, b) => {
        const aDown = a.lastStatus !== 'UP' ? 0 : 1
        const bDown = b.lastStatus !== 'UP' ? 0 : 1
        if (aDown !== bDown) return aDown - bDown
        return parseFloat(a.uptime24h) - parseFloat(b.uptime24h)
    })

    const visibleEndpoints = sortedEndpoints.slice(0, ENDPOINT_VISIBLE_LIMIT)
    const hiddenCount = endpointHealth.length - visibleEndpoints.length

    return (
        <div className="space-y-4">

            {/* ── Hero KPI Card ─────────────────────────────────────── */}
            <Card className="overflow-hidden p-0">
                <div className="grid lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x">

                    {/* Status + uptime + KPI strip */}
                    <div className="lg:col-span-3 p-5">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="relative flex h-2 w-2">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${hasDown ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                <span className={`relative inline-flex h-2 w-2 rounded-full ${hasDown ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            </span>
                            <span className={`text-[11px] font-semibold uppercase tracking-widest ${hasDown ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {hasDown
                                    ? `${analysis.endpoints.down} system${analysis.endpoints.down > 1 ? 's' : ''} down — needs attention`
                                    : 'All systems operational'}
                            </span>
                            {isLive && (
                                <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    LIVE
                                </span>
                            )}
                            {lastUpdated && (
                                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                        </div>

                        <div className="flex items-baseline gap-2.5">
                            <span className="text-5xl font-bold tracking-tight tabular-nums" style={{ color: uptimeColor }}>
                                {weeklyUptimeNum.toFixed(2)}%
                            </span>
                            <span className="text-sm text-muted-foreground">7-day uptime</span>
                            <span className="text-xs text-muted-foreground/70 ml-auto tabular-nums">
                                {analysis.projects.total} project{analysis.projects.total !== 1 ? 's' : ''} · {analysis.endpoints.total} endpoint{analysis.endpoints.total !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t">
                            <Metric label="Up" value={analysis.endpoints.active} accent="text-emerald-600 dark:text-emerald-400" />
                            <Metric label="Down" value={analysis.endpoints.down} accent={hasDown ? "text-red-600 dark:text-red-400" : ""} />
                            <Metric
                                label="Avg Response"
                                value={analysis.performance.avgResponseTime != null ? `${analysis.performance.avgResponseTime}ms` : '—'}
                            />
                            <Metric
                                label="Weekly Checks"
                                value={analysis.uptime.weeklyChecks.total.toLocaleString()}
                            />
                        </div>
                    </div>

                    {/* Live activity sparkline */}
                    <div className="lg:col-span-2 p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Activity className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Live activity
                                </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                                {chartData.length} recent
                            </span>
                        </div>

                        <div className="h-[80px] -mx-2 flex-1">
                            {hasChart ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gMini" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Tooltip
                                            cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            contentStyle={{
                                                fontSize: 11,
                                                borderRadius: 8,
                                                background: 'var(--popover)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--popover-foreground)',
                                            }}
                                            labelFormatter={(_, p) => p?.[0]?.payload?.time ?? ''}
                                            formatter={(value) => {
                                                const v = typeof value === 'number' ? value : 0
                                                return [`${v}ms`, 'Response']
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="ms"
                                            stroke="#3b82f6"
                                            fill="url(#gMini)"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState text="Waiting for monitoring data…" />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <span>Fastest</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {fastest ? `${fastest}ms` : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Slowest</span>
                                <span className="font-semibold text-foreground tabular-nums">
                                    {slowest ? `${slowest}ms` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* ── Recent Activity Chart (full width) ────────────────── */}
            <Card>
                <div className="flex items-center justify-between p-4 pb-2">
                    <div>
                        <h3 className="text-sm font-semibold">Response time</h3>
                        <p className="text-xs text-muted-foreground">Last {chartData.length || 'few'} checks across all endpoints</p>
                    </div>
                    {hasChart && (
                        <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>Avg <span className="font-semibold text-foreground tabular-nums">
                                {Math.round(chartData.reduce((s, d) => s + d.ms, 0) / chartData.length)}ms
                            </span></span>
                            <span className="h-3 w-px bg-border" />
                            <span>Range <span className="font-semibold text-foreground tabular-nums">
                                {fastest}–{slowest}ms
                            </span></span>
                        </div>
                    )}
                </div>
                <CardContent className="px-2 pb-3 pt-0">
                    <div className="h-[200px] text-foreground/15">
                        {hasChart ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gActivity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                        tickLine={false}
                                        axisLine={false}
                                        unit="ms"
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        contentStyle={{
                                            fontSize: 11,
                                            borderRadius: 8,
                                            background: 'var(--popover)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--popover-foreground)',
                                        }}
                                        formatter={(value) => {
                                            const v = typeof value === 'number' ? value : 0
                                            return [`${v}ms`, 'Response']
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="ms"
                                        stroke="#3b82f6"
                                        fill="url(#gActivity)"
                                        strokeWidth={2}
                                        dot={{ r: 2, strokeWidth: 0, fill: '#3b82f6' }}
                                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--background)', fill: '#3b82f6' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState text="Waiting for monitoring data — checks will appear here once your endpoints run." />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Endpoints (top N by priority) ─────────────────────── */}
            {endpointHealth.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">Endpoints</h3>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {endpointHealth.length}
                            </Badge>
                            {hasDown && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                    Sorted by priority
                                </span>
                            )}
                        </div>
                        {hiddenCount > 0 && (
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                                <Link href="/dashboard/monitoring/allEndPoints">
                                    View all ({endpointHealth.length})
                                    <ArrowRight className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {visibleEndpoints.map((ep) => <EndpointCard key={ep.id} ep={ep} />)}
                    </div>
                    {hiddenCount > 0 && (
                        <div className="mt-3 text-center">
                            <Button asChild variant="outline" size="sm" className="text-xs">
                                <Link href="/dashboard/monitoring/allEndPoints">
                                    + {hiddenCount} more endpoint{hiddenCount > 1 ? 's' : ''}
                                </Link>
                            </Button>
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

/* ── Sub-components ─────────────────────────────────────────────── */

const Metric = ({
    label, value, accent = "",
}: { label: string; value: string | number; accent?: string }) => (
    <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold tabular-nums leading-none ${accent}`}>{value}</p>
    </div>
)

const EmptyState = ({ text }: { text: string }) => (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md px-4 text-center">
        {text}
    </div>
)

const EndpointCard = ({ ep }: { ep: EndpointHealth[number] }) => {
    const isUp = ep.lastStatus === 'UP'
    const uptimePct = parseFloat(ep.uptime24h)
    const barColor = uptimePct >= 99 ? '#10b981' : uptimePct >= 95 ? '#f59e0b' : '#ef4444'

    return (
        <Card className="overflow-hidden hover:border-primary/30 transition-colors">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2 shrink-0">
                                {!isUp && <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />}
                                <span className={`relative inline-flex h-2 w-2 rounded-full ${isUp ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </span>
                            <p className="font-semibold text-sm truncate">{ep.name}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 ml-4">{ep.url}</p>
                    </div>
                    <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${isUp
                            ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400'
                            : 'border-red-200 text-red-700 dark:border-red-900 dark:text-red-400'
                            }`}
                    >
                        {ep.lastStatus ?? '—'}
                    </Badge>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime · 24h</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: barColor }}>
                            {ep.uptime24h}
                        </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(uptimePct, 100)}%`, backgroundColor: barColor }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t gap-2">
                    <span className="truncate">{ep.project.projectName}</span>
                    <span className="shrink-0 tabular-nums">
                        {ep.checks24h} checks · {ep.checkInterval}m
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}

export default Cards
