"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Log } from "@/types/logs.types"
import { api } from "@/trpc/trpc-server/react"
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Download, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Pagination } from "../../monitoring/create-project/_components/pagination"
import { LogDetailDialog } from "./log-detail-dialog"

interface LogsTableProps {
    initialData: Log[]
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "UP":
            return "bg-green-100 text-green-800 border-green-200"
        case "DOWN":
            return "bg-red-100 text-red-800 border-red-200"
        case "REDIRECT":
            return "bg-blue-100 text-blue-800 border-blue-200"
        case "CLIENT_ERROR":
            return "bg-yellow-100 text-yellow-800 border-yellow-200"
        default:
            return "bg-gray-100 text-gray-800 border-gray-200"
    }
}

const getHttpColor = (code: number | null) => {
    if (!code) return "text-gray-500"
    if (code >= 200 && code < 300) return "text-green-600"
    if (code >= 400 && code < 500) return "text-yellow-600"
    if (code >= 500) return "text-red-600"
    return "text-gray-600"
}

type StatusFilter = "UP" | "DOWN" | "REDIRECT" | "CLIENT_ERROR" | "UNKNOWN" | "all"
type DnsFilter = "RESOLVED" | "FAILED" | "all"
type SortBy = "checkedAt" | "responseTime" | "httpCode"
type SortOrder = "asc" | "desc"

export default function LogsTable({ initialData }: LogsTableProps) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [dnsFilter, setDnsFilter] = useState<DnsFilter>("all")
    const [projectSearch, setProjectSearch] = useState("")
    const [endpointSearch, setEndpointSearch] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [sortBy, setSortBy] = useState<SortBy>("checkedAt")
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
    const [activeChip, setActiveChip] = useState<string | null>(null)

    // Active query inputs — only updated when "Apply Filters" clicked
    const [activeFilters, setActiveFilters] = useState({
        status: undefined as Exclude<StatusFilter, "all"> | undefined,
        dnsStatus: undefined as Exclude<DnsFilter, "all"> | undefined,
        projectName: undefined as string | undefined,
        endpointName: undefined as string | undefined,
        startDate: undefined as Date | undefined,
        endDate: undefined as Date | undefined,
    })

    const { data, isLoading } = api.logs.getAllLogs.useQuery({
        page,
        limit,
        sortBy,
        sortOrder,
        ...activeFilters,
    })

    const toggleSort = (col: SortBy) => {
        if (sortBy === col) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        } else {
            setSortBy(col)
            setSortOrder("desc")
        }
    }

    const SortIcon = ({ col }: { col: SortBy }) => {
        if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
        return sortOrder === "asc"
            ? <ArrowUp className="h-3 w-3 ml-1" />
            : <ArrowDown className="h-3 w-3 ml-1" />
    }

    const applyChip = (chip: string) => {
        const now = new Date()
        let newFilters = { ...activeFilters }
        let chipDateStart = ""
        let chipDateEnd = ""
        let chipStatus: StatusFilter = "all"
        let chipDns: DnsFilter = "all"

        const toDateString = (d: Date) => d.toISOString().split("T")[0]

        switch (chip) {
            case "today": {
                const start = new Date(now); start.setHours(0, 0, 0, 0)
                chipDateStart = toDateString(start)
                chipDateEnd = toDateString(now)
                newFilters = { ...newFilters, startDate: start, endDate: new Date(`${chipDateEnd}T23:59:59.999`) }
                break
            }
            case "24h": {
                const start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                chipDateStart = toDateString(start)
                chipDateEnd = toDateString(now)
                newFilters = { ...newFilters, startDate: start, endDate: now }
                break
            }
            case "7d": {
                const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                chipDateStart = toDateString(start)
                chipDateEnd = toDateString(now)
                newFilters = { ...newFilters, startDate: start, endDate: now }
                break
            }
            case "errors": {
                chipStatus = "DOWN"
                newFilters = { ...newFilters, status: "DOWN" }
                break
            }
            case "dns-failed": {
                chipDns = "FAILED"
                newFilters = { ...newFilters, dnsStatus: "FAILED" }
                break
            }
        }

        setActiveChip(chip)
        setStartDate(chipDateStart)
        setEndDate(chipDateEnd)
        if (chipStatus !== "all") setStatusFilter(chipStatus)
        if (chipDns !== "all") setDnsFilter(chipDns)
        setActiveFilters(newFilters)
        setPage(1)
    }

    const logs = (data?.data ?? initialData) as Log[]
    const totalPages = data?.pagination?.totalPages ?? 1
    const totalCount = data?.pagination?.total ?? 0

    const exportMut = api.logs.exportLogs.useMutation({
        onSuccess: (res) => {
            const rows = res.data
            if (rows.length === 0) {
                toast.info("No logs match the current filters")
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
                ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
            ].join("\r\n")

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            const isFiltered = Object.values(activeFilters).some((v) => v !== undefined)
            link.download = `monitoring_logs_${isFiltered ? "filtered_" : ""}${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success(`Exported ${rows.length.toLocaleString()} log row${rows.length === 1 ? "" : "s"}`)
        },
        onError: (e) => toast.error(e.message || "Export failed"),
    })

    const handleApplyFilters = () => {
        setActiveChip(null) // manual filters override the chip
        setActiveFilters({
            status: statusFilter === "all" ? undefined : statusFilter,
            dnsStatus: dnsFilter === "all" ? undefined : dnsFilter,
            projectName: projectSearch.trim() || undefined,
            endpointName: endpointSearch.trim() || undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(`${endDate}T23:59:59.999`) : undefined,
        })
        setPage(1)
    }

    const handleReset = () => {
        setStatusFilter("all")
        setDnsFilter("all")
        setProjectSearch("")
        setEndpointSearch("")
        setStartDate("")
        setEndDate("")
        setActiveChip(null)
        setActiveFilters({
            status: undefined,
            dnsStatus: undefined,
            projectName: undefined,
            endpointName: undefined,
            startDate: undefined,
            endDate: undefined,
        })
        setPage(1)
    }

    const handleDownload = () => {
        // Apply current active filters to the export — same shape, no separate UI
        exportMut.mutate({
            ...(activeFilters.status ? { status: activeFilters.status } : {}),
            ...(activeFilters.dnsStatus ? { dnsStatus: activeFilters.dnsStatus } : {}),
            ...(activeFilters.projectName ? { projectName: activeFilters.projectName } : {}),
            ...(activeFilters.endpointName ? { endpointName: activeFilters.endpointName } : {}),
            ...(activeFilters.startDate ? { startDate: activeFilters.startDate } : {}),
            ...(activeFilters.endDate ? { endDate: activeFilters.endDate } : {}),
            limit: 10000,
        })
    }

    const isFiltered = Object.values(activeFilters).some((v) => v !== undefined)

    const chips: { id: string; label: string; tone?: "default" | "danger" | "warning" }[] = [
        { id: "today", label: "Today" },
        { id: "24h", label: "Last 24h" },
        { id: "7d", label: "Last 7 days" },
        { id: "errors", label: "DOWN only", tone: "danger" },
        { id: "dns-failed", label: "DNS failed", tone: "warning" },
    ]

    const chipClass = (chip: { id: string; tone?: string }) => {
        const base = "px-3 py-1 rounded-full text-xs font-medium transition-colors border cursor-pointer"
        if (activeChip === chip.id) {
            if (chip.tone === "danger") return `${base} bg-red-500 text-white border-red-500`
            if (chip.tone === "warning") return `${base} bg-amber-500 text-white border-amber-500`
            return `${base} bg-zinc-900 text-white border-zinc-900`
        }
        return `${base} bg-white text-muted-foreground border-zinc-200 hover:bg-muted`
    }

    return (
        <div className="space-y-3">
            {/* Quick filter chips */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Quick filter:</span>
                {chips.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => applyChip(c.id)}
                        className={chipClass(c)}
                    >
                        {c.label}
                    </button>
                ))}
                {(activeChip || isFiltered) && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-1 rounded-full text-xs font-medium border border-zinc-200 bg-white text-muted-foreground hover:bg-muted"
                    >
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* Filters Card */}
            <Card className="bg-white border shadow-sm">
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Project Name</Label>
                            <Input
                                placeholder="Search project..."
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Endpoint Name</Label>
                            <Input
                                placeholder="Search endpoint..."
                                value={endpointSearch}
                                onChange={(e) => setEndpointSearch(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">DNS Status</Label>
                            <Select value={dnsFilter} onValueChange={(value) => setDnsFilter(value as DnsFilter)}>
                                <SelectTrigger className="h-9 text-sm w-full">
                                    <SelectValue placeholder="Select DNS status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All DNS</SelectItem>
                                    <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                                    <SelectItem value="FAILED">FAILED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Status</Label>
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                                <SelectTrigger className="h-9 text-sm w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="UP">UP</SelectItem>
                                    <SelectItem value="DOWN">DOWN</SelectItem>
                                    <SelectItem value="REDIRECT">REDIRECT</SelectItem>
                                    <SelectItem value="CLIENT_ERROR">CLIENT ERROR</SelectItem>
                                    <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="text-xs text-muted-foreground">
                            {isFiltered ? (
                                <span>
                                    Showing <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> filtered logs
                                </span>
                            ) : (
                                <span>
                                    <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> total logs
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={exportMut.isPending}
                                className="h-9 text-sm"
                            >
                                {exportMut.isPending ? (
                                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Exporting…</>
                                ) : (
                                    <><Download className="h-3.5 w-3.5 mr-1.5" /> Download {isFiltered ? "filtered" : "all"} CSV</>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="px-5 h-9 text-sm"
                            >
                                Reset
                            </Button>
                            <Button
                                onClick={handleApplyFilters}
                                className="px-5 h-9 text-sm bg-black hover:bg-black/90"
                            >
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table — fixed-height area so pagination doesn't jump */}
            <div className="flex flex-col">
                <div className="overflow-hidden rounded-sm border bg-white shadow-sm">
                    <Table className="w-full">
                        <TableHeader className="bg-gradient-to-r from-zinc-950 from-[65%] to-blue-500/40">
                            <TableRow className="border-none hover:bg-transparent">
                                <TableHead
                                    className="text-white font-semibold cursor-pointer select-none"
                                    onClick={() => toggleSort("checkedAt")}
                                >
                                    <span className="inline-flex items-center">Timestamp <SortIcon col="checkedAt" /></span>
                                </TableHead>
                                <TableHead className="text-white font-semibold">Endpoint</TableHead>
                                <TableHead className="text-white font-semibold">Status</TableHead>
                                <TableHead
                                    className="text-white font-semibold cursor-pointer select-none"
                                    onClick={() => toggleSort("httpCode")}
                                >
                                    <span className="inline-flex items-center">HTTP <SortIcon col="httpCode" /></span>
                                </TableHead>
                                <TableHead
                                    className="text-white font-semibold cursor-pointer select-none"
                                    onClick={() => toggleSort("responseTime")}
                                >
                                    <span className="inline-flex items-center">Response Time <SortIcon col="responseTime" /></span>
                                </TableHead>
                                <TableHead className="text-white font-semibold">DNS</TableHead>
                                <TableHead className="text-white font-semibold">SSL</TableHead>
                                <TableHead className="text-white font-semibold">Error</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="p-12 text-center h-[400px]">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="p-12 text-center h-[400px]">
                                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                        <p className="text-lg font-semibold text-muted-foreground">
                                            {isFiltered ? "No logs found" : "No logs available"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {isFiltered
                                                ? "Try adjusting your filters"
                                                : "Logs will appear here once monitoring starts"}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {logs.map((log) => (
                                        <TableRow
                                            key={log.id}
                                            className="transition-colors hover:bg-muted/60 cursor-pointer"
                                            onClick={() => setSelectedLogId(log.id)}
                                        >
                                            <TableCell className="font-mono text-sm">
                                                {new Date(log.checkedAt).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{log.endpoint?.name ?? "N/A"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {log.endpoint?.project?.projectName ?? "N/A"}
                                                    </p>
                                                    <a
                                                        href={log.endpoint?.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-blue-600 hover:underline truncate block max-w-[200px]"
                                                    >
                                                        {log.endpoint?.url}
                                                    </a>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                                            </TableCell>
                                            <TableCell className={`font-mono text-sm font-semibold ${getHttpColor(log.httpCode)}`}>
                                                {log.httpCode ?? "—"}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {log.responseTime ? `${log.responseTime} ms` : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        log.dnsStatus === "RESOLVED"
                                                            ? "bg-green-100 text-green-800 border-green-200"
                                                            : "bg-red-100 text-red-800 border-red-200"
                                                    }
                                                >
                                                    {log.dnsStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        log.sslValid
                                                            ? "bg-green-100 text-green-800 border-green-200"
                                                            : "bg-red-100 text-red-800 border-red-200"
                                                    }
                                                >
                                                    {log.sslValid ? "Valid" : "Invalid"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {log.errorMessage ?? "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Filler rows so pagination stays fixed */}
                                    {Array.from({ length: Math.max(0, limit - logs.length) }).map((_, i) => (
                                        <TableRow key={`filler-${i}`} className="border-b-0 hover:bg-transparent pointer-events-none">
                                            <TableCell colSpan={8} className="h-[57px] p-0">&nbsp;</TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination — always rendered, stays in same position regardless of row count */}
                <div className="flex items-center justify-between mt-3 px-1">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Rows per page</Label>
                        <Select
                            value={String(limit)}
                            onValueChange={(v) => {
                                setLimit(Number(v))
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {totalPages > 1 && (
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    )}
                </div>
            </div>

            <LogDetailDialog
                logId={selectedLogId}
                onClose={() => setSelectedLogId(null)}
            />
        </div>
    )
}
