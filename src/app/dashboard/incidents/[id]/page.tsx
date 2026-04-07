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
    Server
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

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
                <Button variant="outline" size="sm">
                    <Activity className="h-4 w-4 mr-2" />
                    Download Report
                </Button>
            </div>

            {/* Main Content - Improved Layout */}
            {currentIncident && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Root Cause & Duration */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Root Cause Card */}
                        <Card className="p-5 bg-gradient-to-br from-slate-50 to-white border-2">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Root cause
                                    </h3>
                                    <p className="text-lg font-bold text-gray-900 mt-2">
                                        {currentIncident.errorMessage || "Unknown Error"}
                                    </p>
                                    {currentIncident.httpCode && (
                                        <Badge variant="outline" className="mt-3 text-xs">
                                            HTTP {currentIncident.httpCode}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Status Card */}
                        <Card className="p-5 bg-gradient-to-br from-slate-50 to-white border-2">
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${isDown ? 'bg-red-100' : 'bg-green-100'}`}>
                                    {isDown ? (
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                    ) : (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                        Status
                                    </h3>
                                    <Badge
                                        className={`text-base px-3 py-1 ${isDown
                                            ? "bg-red-500 text-white hover:bg-red-600"
                                            : "bg-green-500 text-white hover:bg-green-600"
                                            }`}
                                    >
                                        {isDown ? "Ongoing" : "Resolved"}
                                    </Badge>
                                    <div className="mt-3 space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Started at {new Date(currentIncident.startedAt).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZoneName: 'short'
                                            })}
                                        </p>
                                        {currentIncident.recoveredAt && (
                                            <p className="text-xs text-muted-foreground">
                                                Resolved at {new Date(currentIncident.recoveredAt).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    timeZoneName: 'short'
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Duration Card */}
                        <Card className="p-5 bg-gradient-to-br from-slate-50 to-white border-2">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Clock className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                        Duration
                                    </h3>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {formatDuration(currentIncident.startedAt, currentIncident.recoveredAt || undefined)}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Request Card */}
                        <Card className="p-5 bg-gradient-to-br from-slate-50 to-white border-2">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Server className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                        Request
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                HEAD
                                            </Badge>
                                            <a
                                                href={endpoint.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                                            >
                                                {endpoint.url.slice(0, 35)}...
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - Activity Log & Response */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Activity Log */}
                        <Card className="p-6 border-2">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Activity log
                            </h3>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
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
                        {activityLog && activityLog.length > 0 && (
                            <Card className="p-6 border-2">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Server className="h-5 w-5 text-purple-600" />
                                    Response
                                </h3>
                                <div className="bg-slate-900 text-slate-100 p-5 rounded-lg font-mono text-sm overflow-x-auto">
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
                            </Card>
                        )}
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
