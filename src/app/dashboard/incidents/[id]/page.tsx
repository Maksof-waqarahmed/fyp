"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/trpc/trpc-server/react"
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    ExternalLink,
    Globe,
    Loader2,
    RefreshCw,
    Server,
    ShieldAlert,
    Sparkles,
    Wand2,
    Zap,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Download } from "lucide-react"

interface IncidentLog {
    id: string
    status: string
    httpCode: number | null
    errorMessage: string | null
    checkedAt: string
    responseTime: number | null
    dnsStatus: string
    ip: string | null
    sslValid: boolean
}

function formatDuration(startDate: string, endDate?: string): string {
    const start = new Date(startDate).getTime()
    const end = endDate ? new Date(endDate).getTime() : Date.now()
    const diff = end - start

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
}

// ── Incident Timeline ────────────────────────────────────────────────────────

interface TimelineEvent {
    id: string
    icon: React.ReactNode
    dotColor: string
    title: string
    subtitle?: string
    badge?: { label: string; className: string }
    time?: string
    isLast?: boolean
    isPulse?: boolean
}

interface IncidentTimelineProps {
    currentIncident: {
        status: string
        startedAt: string
        recoveredAt: string | null
        errorMessage: string | null
        httpCode: number | null
        triggerStatus: string
    }
    activityLog: IncidentLog[]
    analysis: {
        category: string
        confidence: string
        summary: string
        likelyCause: string
        recommendedActions: string[]
    } | null
}

function TimelineRow({ event }: { event: TimelineEvent }) {
    return (
        <div className="flex gap-4">
            {/* Dot + line */}
            <div className="flex flex-col items-center">
                <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 z-10 ${event.dotColor}`}
                >
                    {event.isPulse && (
                        <span className="absolute h-9 w-9 rounded-full animate-ping opacity-30 bg-red-500" />
                    )}
                    {event.icon}
                </div>
                {!event.isLast && (
                    <div className="w-px flex-1 mt-1 mb-1 border-l-2 border-dashed border-border" />
                )}
            </div>

            {/* Content */}
            <div className={`pb-6 flex-1 min-w-0 ${event.isLast ? "" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold">{event.title}</p>
                    {event.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${event.badge.className}`}>
                            {event.badge.label}
                        </span>
                    )}
                </div>
                {event.subtitle && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{event.subtitle}</p>
                )}
                {event.time && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.time).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                )}
            </div>
        </div>
    )
}

function IncidentTimeline({ currentIncident, activityLog, analysis }: IncidentTimelineProps) {
    const isResolved = currentIncident.status !== "ongoing"

    // Sorted logs ascending (oldest → newest)
    const sortedLogs = [...activityLog].sort(
        (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    )

    // Count consecutive DOWN checks
    const downLogs = sortedLogs.filter(
        (l) => l.status === "DOWN" || l.status === "CLIENT_ERROR" || l.status === "UNKNOWN"
    )

    // First UP log after the incident started (recovery check)
    const recoveryLog = sortedLogs.find(
        (l) =>
            l.status === "UP" &&
            new Date(l.checkedAt) > new Date(currentIncident.startedAt)
    )

    const events: TimelineEvent[] = []

    // 1 — Downtime started
    events.push({
        id: "start",
        dotColor: "bg-red-100 border-2 border-red-300 relative",
        isPulse: !isResolved,
        icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
        title: "Endpoint went DOWN",
        subtitle: currentIncident.errorMessage ?? "Connection failed",
        badge: currentIncident.httpCode
            ? { label: `HTTP ${currentIncident.httpCode}`, className: "bg-red-50 text-red-700 border-red-200" }
            : undefined,
        time: currentIncident.startedAt,
    })

    // 2 — Consecutive failures summary (if more than 1 DOWN log)
    if (downLogs.length > 1) {
        events.push({
            id: "checks",
            dotColor: "bg-orange-100 border-2 border-orange-300",
            icon: <RefreshCw className="h-4 w-4 text-orange-600" />,
            title: `${downLogs.length} monitor checks failed`,
            subtitle: `Monitoring continued detecting the failure every check interval.`,
        })
    }

    // 3 — AI Analysis (if available)
    if (analysis) {
        events.push({
            id: "ai",
            dotColor: "bg-indigo-100 border-2 border-indigo-300",
            icon: <Sparkles className="h-4 w-4 text-indigo-600" />,
            title: "AI Root Cause Analysis completed",
            subtitle: analysis.summary,
            badge: {
                label: `${analysis.category} · ${analysis.confidence} confidence`,
                className: "bg-indigo-50 text-indigo-700 border-indigo-200",
            },
        })
    }

    // 4 — Recovery log (first UP after incident)
    if (recoveryLog) {
        events.push({
            id: "recovery-check",
            dotColor: "bg-emerald-100 border-2 border-emerald-300",
            icon: <Zap className="h-4 w-4 text-emerald-600" />,
            title: "First successful check after downtime",
            subtitle: recoveryLog.responseTime
                ? `Response time: ${recoveryLog.responseTime}ms`
                : "Endpoint responded successfully",
            time: recoveryLog.checkedAt,
        })
    }

    // 5 — Final event: resolved or ongoing
    if (isResolved && currentIncident.recoveredAt) {
        events.push({
            id: "resolved",
            isLast: true,
            dotColor: "bg-emerald-500",
            icon: <CheckCircle2 className="h-4 w-4 text-white" />,
            title: "Incident RESOLVED",
            subtitle: `Total downtime: ${formatDuration(currentIncident.startedAt, currentIncident.recoveredAt)}`,
            time: currentIncident.recoveredAt,
        })
    } else {
        events.push({
            id: "ongoing",
            isLast: true,
            dotColor: "bg-red-500 relative",
            isPulse: true,
            icon: <AlertTriangle className="h-4 w-4 text-white" />,
            title: "Incident still ONGOING",
            subtitle: `Running for ${formatDuration(currentIncident.startedAt)} — awaiting recovery`,
        })
    }

    return (
        <Card className="p-6 border-2">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Incident Timeline
            </h3>
            <div className="pl-1">
                {events.map((event) => (
                    <TimelineRow key={event.id} event={event} />
                ))}
            </div>
        </Card>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
    const params = useParams()
    const endpointId = params.id as string

    const { data, isLoading } = api.logs.getEndpointIncidentDetail.useQuery({ endpointId })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data || !data.endpoint) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <AlertTriangle className="h-12 w-12 text-red-400 mb-3" />
                <p className="text-lg font-semibold text-muted-foreground">Endpoint not found</p>
                <Link href="/dashboard/incidents">
                    <Button className="mt-4" variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Incidents
                    </Button>
                </Link>
            </div>
        )
    }

    const { endpoint, currentIncident, activityLog } = data
    const isDown = currentIncident?.status === "ongoing"

    return <IncidentDetailView
        endpoint={endpoint}
        currentIncident={currentIncident}
        activityLog={activityLog}
        endpointId={endpointId}
        isDown={isDown}
    />
}

interface IncidentDetailViewProps {
    endpoint: { id: string; name: string; url: string }
    currentIncident: {
        status: string
        startedAt: string
        recoveredAt: string | null
        errorMessage: string | null
        httpCode: number | null
        triggerStatus: string
    } | null
    activityLog: IncidentLog[]
    endpointId: string
    isDown: boolean
}

function IncidentDetailView({ endpoint, currentIncident, activityLog, endpointId, isDown }: IncidentDetailViewProps) {
    const utils = api.useUtils()

    // Auto-loads any DB-cached analysis on mount — no AI call, just a SELECT.
    const { data: aiData } = api.logs.getIncidentAnalysis.useQuery(
        { endpointId },
        { staleTime: 5 * 60 * 1000 }
    )

    const regenerateMut = api.logs.regenerateIncidentAnalysis.useMutation({
        onSuccess: () => {
            utils.logs.getIncidentAnalysis.invalidate({ endpointId })
        },
    })

    const isAnalyzing = regenerateMut.isPending
    const analysis = aiData?.analysis ?? regenerateMut.data?.analysis ?? null
    const analyzedAt = aiData?.analyzedAt ?? null
    const hasAnalysis = analysis !== null

    // CSV export — downloads the last 1000 logs for this endpoint
    const exportMut = api.logs.exportLogs.useMutation({
        onSuccess: (res) => {
            const rows = res.data
            if (rows.length === 0) {
                toast.info("No logs to export for this endpoint yet.")
                return
            }

            const headers = Object.keys(rows[0]) as (keyof typeof rows[0])[]

            const escape = (v: unknown) => {
                if (v === null || v === undefined) return ""
                const s = String(v)
                return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
            }

            const csv = [
                headers.join(","),
                ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
            ].join("\r\n")

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `${endpoint.name.replace(/[^a-z0-9]+/gi, "_")}_logs_${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success(`Exported ${rows.length} log row${rows.length === 1 ? "" : "s"}`)
        },
        onError: (e) => toast.error(e.message || "Failed to export"),
    })

    const categoryStyle = (cat: string) => {
        switch (cat) {
            case "NETWORK": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
            case "DNS": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
            case "SSL": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
            case "SERVER": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
            case "APPLICATION": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
            default: return "bg-muted text-muted-foreground border-border"
        }
    }

    const confidenceStyle = (conf: string) => {
        switch (conf) {
            case "HIGH": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
            case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
            default: return "bg-muted text-muted-foreground border-border"
        }
    }

    return (
        <div className="w-full space-y-6 pb-8">
            {/* Header - Keep as is (good design) */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/incidents">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        {isDown ? (
                            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        ) : (
                            <div className="h-3 w-3 bg-green-500 rounded-full" />
                        )}
                        <h1 className="text-2xl font-bold">
                            {isDown ? "Ongoing" : "Resolved"} incident on {endpoint.name}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>HTTP/S monitor for</span>
                        <a
                            href={endpoint.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                            {endpoint.url}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportMut.mutate({ endpointId, limit: 1000 })}
                    disabled={exportMut.isPending}
                >
                    {exportMut.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4 mr-2" />
                    )}
                    {exportMut.isPending ? "Generating…" : "Download Report"}
                </Button>
            </div>

            {/* Main Content - New 2-Row Layout */}
            {currentIncident && (
                <div className="space-y-6">
                    {/* Top Row - 4 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Root Cause Card */}
                        <Card className="p-4 bg-gradient-to-br from-muted/50 to-card border-2">
                            <div className="flex items-start gap-2">
                                <div className="p-2 bg-red-100 rounded-lg shrink-0">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Root cause
                                    </h3>
                                    <p className="text-sm font-bold text-foreground mt-1 line-clamp-2">
                                        {currentIncident.errorMessage || "Unknown Error"}
                                    </p>
                                    {currentIncident.httpCode && (
                                        <Badge variant="outline" className="mt-2 text-xs">
                                            HTTP {currentIncident.httpCode}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Status Card */}
                        <Card className="p-4 bg-gradient-to-br from-muted/50 to-card border-2">
                            <div className="flex items-start gap-2">
                                <div className={`p-2 rounded-lg shrink-0 ${isDown ? 'bg-red-100' : 'bg-green-100'}`}>
                                    {isDown ? (
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Status
                                    </h3>
                                    <Badge
                                        className={`text-sm px-2 py-0.5 mt-1 ${isDown
                                            ? "bg-red-500 text-white hover:bg-red-600"
                                            : "bg-green-500 text-white hover:bg-green-600"
                                            }`}
                                    >
                                        {isDown ? "Ongoing" : "Resolved"}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-2 truncate">
                                        {new Date(currentIncident.startedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Duration Card */}
                        <Card className="p-4 bg-gradient-to-br from-muted/50 to-card border-2">
                            <div className="flex items-start gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Duration
                                    </h3>
                                    <p className="text-xl font-bold text-foreground mt-1">
                                        {formatDuration(currentIncident.startedAt, currentIncident.recoveredAt || undefined)}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Request Card */}
                        <Card className="p-4 bg-gradient-to-br from-muted/50 to-card border-2">
                            <div className="flex items-start gap-2">
                                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                                    <Server className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Request
                                    </h3>
                                    <Badge variant="secondary" className="font-mono text-xs mt-1">
                                        HEAD
                                    </Badge>
                                    <a
                                        href={endpoint.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1 mt-1"
                                    >
                                        {endpoint.url.slice(0, 25)}...
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Incident Timeline */}
                    <IncidentTimeline
                        currentIncident={currentIncident}
                        activityLog={activityLog}
                        analysis={analysis}
                    />

                    {/* AI Analysis Card */}
                    <Card className="p-6 border-2 bg-gradient-to-br from-indigo-50/50 via-card to-purple-50/50 dark:from-indigo-950/30 dark:via-card dark:to-purple-950/30">
                        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shrink-0">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">AI Root Cause Analysis</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Powered by GPT-4o-mini
                                        {analyzedAt && ` · last analyzed ${new Date(analyzedAt).toLocaleString()}`}
                                    </p>
                                </div>
                            </div>
                            {!hasAnalysis && !isAnalyzing && (
                                <Button
                                    onClick={() => regenerateMut.mutate({ endpointId })}
                                    className="bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                                >
                                    <Wand2 className="h-4 w-4 mr-2" />
                                    Analyze with AI
                                </Button>
                            )}
                            {hasAnalysis && !isAnalyzing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => regenerateMut.mutate({ endpointId })}
                                >
                                    <Wand2 className="h-3 w-3 mr-1" />
                                    Re-analyze
                                </Button>
                            )}
                        </div>

                        {!hasAnalysis && !isAnalyzing && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Click <span className="font-semibold">Analyze with AI</span> to get a structured root-cause diagnosis based on the recent logs and similar past incidents. The result is saved permanently for this incident.</p>
                            </div>
                        )}

                        {isAnalyzing && (
                            <div className="text-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-2" />
                                <p className="text-sm text-muted-foreground">Analyzing incident…</p>
                            </div>
                        )}

                        {regenerateMut.isError && !isAnalyzing && (
                            <div className="text-center py-6 text-sm text-red-600 bg-red-50 rounded-lg">
                                {regenerateMut.error.message || "Analysis failed. Try again in a moment."}
                            </div>
                        )}

                        {hasAnalysis && !isAnalyzing && analysis && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={categoryStyle(analysis.category)}>
                                        {analysis.category}
                                    </Badge>
                                    <Badge variant="outline" className={confidenceStyle(analysis.confidence)}>
                                        {analysis.confidence} confidence
                                    </Badge>
                                </div>

                                <div>
                                    <p className="text-base font-semibold text-foreground">
                                        {analysis.summary}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {analysis.likelyCause}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                        Recommended Actions
                                    </h4>
                                    <ol className="space-y-2 text-sm">
                                        {analysis.recommendedActions.map((action: string, i: number) => (
                                            <li key={i} className="flex gap-3">
                                                <span className="shrink-0 h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                                                    {i + 1}
                                                </span>
                                                <span className="text-foreground">{action}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Bottom Row - Activity Log & Response Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Activity Log */}
                        <Card className="p-6 border-2">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Activity log
                            </h3>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {activityLog && activityLog.length > 0 ? (
                                    activityLog.map((log: IncidentLog) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-4 pb-4 border-b last:border-0 hover:bg-muted/30 p-3 rounded-lg transition-colors"
                                        >
                                            <div className="mt-1 shrink-0">
                                                {log.status === "DOWN" || log.status === "CLIENT_ERROR" || log.status === "UNKNOWN" ? (
                                                    <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                                    </div>
                                                ) : (
                                                    <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm mb-1">
                                                    {log.status === "DOWN" || log.status === "CLIENT_ERROR" || log.status === "UNKNOWN"
                                                        ? `${log.errorMessage || "Error detected"} confirmed by Monitor`
                                                        : "Incident resolved"}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(log.checkedAt).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            timeZoneName: 'short'
                                                        })}
                                                    </span>
                                                    {log.httpCode && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {log.httpCode}
                                                        </Badge>
                                                    )}
                                                    {log.responseTime && (
                                                        <span>{log.responseTime}ms</span>
                                                    )}
                                                    {log.ip && (
                                                        <span className="font-mono">{log.ip}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                        <p>No activity logs available</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Response Details */}
                        <Card className="p-6 border-2">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Server className="h-5 w-5 text-purple-600" />
                                Response
                            </h3>
                            {activityLog && activityLog.length > 0 ? (
                                <div className="bg-slate-900 text-slate-100 p-5 rounded-lg font-mono text-sm overflow-x-auto max-h-[600px] overflow-y-auto">
                                    <pre className="whitespace-pre-wrap break-all">
                                        {JSON.stringify(
                                            {
                                                "Content-Length": activityLog[0]?.responseTime ? `${activityLog[0].responseTime}ms` : "N/A",
                                                "Content-Type": "text/html; charset=utf-8",
                                                "Date": new Date(activityLog[0]?.checkedAt).toUTCString(),
                                                "Status": currentIncident.triggerStatus,
                                                "HTTP Code": activityLog[0]?.httpCode || "N/A",
                                                "DNS": activityLog[0]?.dnsStatus || "N/A",
                                                "IP": activityLog[0]?.ip || "N/A",
                                                "SSL": activityLog[0]?.sslValid ? "Valid" : "Invalid",
                                            },
                                            null,
                                            2
                                        )}
                                    </pre>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                    <p>No response data available</p>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* No Incident State */}
            {!currentIncident && (
                <Card className="p-12 text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Recent Incidents</h3>
                    <p className="text-muted-foreground">
                        This endpoint has been running smoothly with no incidents in the last 30 days.
                    </p>
                </Card>
            )}
        </div>
    )
}
