"use client"

import { useState } from "react"
import { api } from "@/trpc/trpc-server/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination } from "../../create-project/_components/pagination"
import {
    AlertTriangle, CheckCircle2, Clock, Loader2,
    ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react"

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const days = Math.floor(totalSec / 86400)
    const hours = Math.floor((totalSec % 86400) / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60

    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return "just now"
}

function triggerBadge(status: string) {
    const map: Record<string, string> = {
        DOWN: "bg-red-100 text-red-800 border-red-200",
        CLIENT_ERROR: "bg-orange-100 text-orange-800 border-orange-200",
        UNKNOWN: "bg-gray-100 text-gray-700 border-gray-200",
    }
    return (
        <Badge variant="outline" className={map[status] ?? "bg-gray-100 text-gray-700"}>
            {status.replace("_", " ")}
        </Badge>
    )
}

// ─── types ───────────────────────────────────────────────────────────────────

interface Incident {
    id: string
    endpoint: { id: string; name: string; url: string; project: { id: string; projectName: string } }
    startedAt: string
    recoveredAt: string | null
    durationMs: number
    status: "ongoing" | "resolved"
    triggerStatus: string
    httpCode: number | null
    errorMessage: string | null
}

// ─── incident card ────────────────────────────────────────────────────────────

function IncidentCard({ incident }: { incident: Incident }) {
    const [expanded, setExpanded] = useState(false)
    const isOngoing = incident.status === "ongoing"

    return (
        <div className={`relative border rounded-lg overflow-hidden transition-all ${isOngoing ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"}`}>
            {/* left color strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOngoing ? "bg-red-500" : "bg-green-500"}`} />

            <div className="pl-4 pr-4 py-4">
                <div className="flex items-start justify-between gap-4">
                    {/* left: icon + info */}
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            {isOngoing
                                ? <AlertTriangle className="h-5 w-5 text-red-500" />
                                : <CheckCircle2 className="h-5 w-5 text-green-500" />
                            }
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{incident.endpoint.name}</span>
                                <Badge variant="outline" className="text-xs text-muted-foreground border-gray-200">
                                    {incident.endpoint.project.projectName}
                                </Badge>
                                {triggerBadge(incident.triggerStatus)}
                                {incident.httpCode && (
                                    <Badge variant="outline" className="text-xs border-gray-200 text-muted-foreground">
                                        HTTP {incident.httpCode}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <a
                                    href={incident.endpoint.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {incident.endpoint.url}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Started: {new Date(incident.startedAt).toLocaleString()} ({timeAgo(incident.startedAt)})
                                </span>
                                {incident.recoveredAt && (
                                    <span>Recovered: {new Date(incident.recoveredAt).toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* right: duration + status + expand */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                            <p className={`text-sm font-bold ${isOngoing ? "text-red-600" : "text-gray-700"}`}>
                                {formatDuration(isOngoing ? Date.now() - new Date(incident.startedAt).getTime() : incident.durationMs)}
                            </p>
                            <p className="text-xs text-muted-foreground">{isOngoing ? "ongoing" : "downtime"}</p>
                        </div>

                        <Badge className={isOngoing
                            ? "bg-red-100 text-red-800 border-red-300 hover:bg-red-100"
                            : "bg-green-100 text-green-800 border-green-300 hover:bg-green-100"
                        } variant="outline">
                            {isOngoing ? "ONGOING" : "RESOLVED"}
                        </Badge>

                        {incident.errorMessage && (
                            <Button
                                size="icon" variant="ghost"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => setExpanded((p) => !p)}
                            >
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>

                {/* expanded: error message */}
                {expanded && incident.errorMessage && (
                    <div className="mt-3 ml-8 p-3 bg-gray-100 rounded text-xs text-gray-700 font-mono break-all">
                        {incident.errorMessage}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── main component ───────────────────────────────────────────────────────────

export function IncidentsTimeline() {
    const [page, setPage] = useState(1)
    const [projectInput, setProjectInput] = useState("")
    const [fromDateInput, setFromDateInput] = useState("")
    const [toDateInput, setToDateInput] = useState("")
    const [statusInput, setStatusInput] = useState<"all" | "ongoing" | "resolved">("all")
    const [daysInput, setDaysInput] = useState("30")

    const [applied, setApplied] = useState({
        projectId: undefined as string | undefined,
        status: undefined as "ongoing" | "resolved" | undefined,
        fromDate: "",
        toDate: "",
        days: 30,
    })

    const { data, isLoading } = api.logs.getIncidents.useQuery({
        page,
        limit: 10,
        ...applied,
    })

    const incidents: Incident[] = (data?.data ?? []) as Incident[]
    const summary = data?.summary
    const totalPages = data?.totalPages ?? 1

    const applyFilters = () => {
        setPage(1)
        setApplied({
            projectId: projectInput.trim() || undefined,
            status: statusInput === "all" ? undefined : statusInput,
            fromDate: fromDateInput,
            toDate: toDateInput,
            days: parseInt(daysInput) || 30,
        })
    }

    const resetFilters = () => {
        setProjectInput("")
        setFromDateInput("")
        setToDateInput("")
        setStatusInput("all")
        setDaysInput("30")
        setPage(1)
        setApplied({ projectId: undefined, status: undefined, fromDate: "", toDate: "", days: 30 })
    }

    return (
        <div className="w-full space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Incident Timeline</h1>

            {/* ── Summary Bar ── */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-4 rounded-sm shadow-sm border">
                        <p className="text-xs text-muted-foreground uppercase font-medium">Total Incidents</p>
                        <p className="text-2xl font-bold mt-1">{summary.total}</p>
                    </Card>
                    <Card className="p-4 rounded-sm shadow-sm border bg-red-50">
                        <p className="text-xs text-red-600 uppercase font-medium">Ongoing</p>
                        <p className="text-2xl font-bold mt-1 text-red-600">{summary.ongoing}</p>
                    </Card>
                    <Card className="p-4 rounded-sm shadow-sm border bg-green-50">
                        <p className="text-xs text-green-600 uppercase font-medium">Resolved</p>
                        <p className="text-2xl font-bold mt-1 text-green-600">{summary.resolved}</p>
                    </Card>
                    <Card className="p-4 rounded-sm shadow-sm border">
                        <p className="text-xs text-muted-foreground uppercase font-medium">Avg Downtime</p>
                        <p className="text-2xl font-bold mt-1">
                            {summary.avgDowntimeMs > 0 ? formatDuration(summary.avgDowntimeMs) : "—"}
                        </p>
                    </Card>
                </div>
            )}

            {/* ── Filters ── */}
            <Card className="p-3 px-6 rounded-sm gap-2 shadow-sm border bg-white">
                <CardTitle className="mb-2 text-lg font-semibold">Filter</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">Look Back (days)</label>
                        <Select value={daysInput} onValueChange={setDaysInput}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="14">Last 14 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">Status</label>
                        <Select value={statusInput} onValueChange={(v) => setStatusInput(v as typeof statusInput)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="ongoing">Ongoing</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">From Date</label>
                        <Input type="date" value={fromDateInput} onChange={(e) => setFromDateInput(e.target.value)} />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">To Date</label>
                        <Input type="date" value={toDateInput} onChange={(e) => setToDateInput(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <Button className="cursor-pointer w-full" onClick={applyFilters}>Apply</Button>
                        <Button variant="outline" className="cursor-pointer w-full" onClick={resetFilters}>Reset</Button>
                    </div>
                </div>
            </Card>

            {/* ── Timeline ── */}
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : incidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mb-3" />
                        <p className="text-lg font-semibold text-muted-foreground">No incidents found</p>
                        <p className="text-sm text-muted-foreground mt-1">All your endpoints are running smoothly.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {incidents.map((incident) => (
                            <IncidentCard key={`${incident.id}-${incident.startedAt}`} incident={incident} />
                        ))}
                    </div>
                )}

                {incidents.length > 0 && (
                    <div className="mt-4">
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </CardContent>
        </div>
    )
}
