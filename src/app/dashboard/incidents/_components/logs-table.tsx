"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"
import { Pagination } from "../../monitoring/create-project/_components/pagination"

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

export default function LogsTable({ initialData }: LogsTableProps) {
    const [statusFilter, setStatusFilter] = useState<"UP" | "DOWN" | "all">("all")
    const [dnsFilter, setDnsFilter] = useState<"RESOLVED" | "FAILED" | "all">("all")
    const [projectSearch, setProjectSearch] = useState("")
    const [endpointSearch, setEndpointSearch] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [page, setPage] = useState(1)
    const limit = 10

    // Use client-side query
    const { data, isLoading } = api.logs.getAllLogs.useQuery(
        {
            page,
            limit,
            status: statusFilter === "all" ? undefined : statusFilter,
            dnsStatus: dnsFilter === "all" ? undefined : dnsFilter,
            projectName: projectSearch || undefined,
            endpointName: endpointSearch || undefined,
        },
        {
            enabled: true,
        }
    )

    const logs = (data?.data ?? initialData) as Log[]
    const totalPages = data?.pagination?.totalPages ?? 1

    const handleReset = () => {
        setStatusFilter("all")
        setDnsFilter("all")
        setProjectSearch("")
        setEndpointSearch("")
        setStartDate("")
        setEndDate("")
        setPage(1)
    }

    const handleApplyFilters = () => {
        setPage(1)
    }

    return (
        <div className="space-y-3">
            {/* Filters Card */}
            <Card className="bg-white border shadow-sm">
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        {/* Project Name */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Project Name</Label>
                            <Input
                                placeholder="Search project..."
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Endpoint Name */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Endpoint Name</Label>
                            <Input
                                placeholder="Search endpoint..."
                                value={endpointSearch}
                                onChange={(e) => setEndpointSearch(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* DNS Status */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">DNS Status</Label>
                            <Select value={dnsFilter} onValueChange={(value) => setDnsFilter(value as typeof dnsFilter)}>
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

                        {/* Status Filter */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Status</Label>
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
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

                        {/* Start Date */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-gray-700">Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* End Date */}
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

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
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
                </CardContent>
            </Card>

            {/* Logs Table */}
            <div>
                <Table className="w-full overflow-hidden rounded-sm border bg-white shadow-sm">
                    <TableHeader className="bg-gradient-to-r from-zinc-950 from-[65%] to-blue-500/40">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="text-white font-semibold">Timestamp</TableHead>
                            <TableHead className="text-white font-semibold">Endpoint</TableHead>
                            <TableHead className="text-white font-semibold">Status</TableHead>
                            <TableHead className="text-white font-semibold">HTTP</TableHead>
                            <TableHead className="text-white font-semibold">Response Time</TableHead>
                            <TableHead className="text-white font-semibold">DNS</TableHead>
                            <TableHead className="text-white font-semibold">SSL</TableHead>
                            <TableHead className="text-white font-semibold">Error</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="p-12 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="p-12 text-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                    <p className="text-lg font-semibold text-muted-foreground">
                                        {projectSearch || endpointSearch || statusFilter !== "all" || dnsFilter !== "all"
                                            ? "No logs found"
                                            : "No logs available"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {projectSearch || endpointSearch || statusFilter !== "all" || dnsFilter !== "all"
                                            ? "Try adjusting your filters"
                                            : "Logs will appear here once monitoring starts"}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="transition-colors hover:bg-muted/50">
                                    <TableCell className="font-mono text-sm">
                                        {new Date(log.checkedAt).toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
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
                                                className="text-xs text-blue-600 hover:underline truncate block max-w-[200px]"
                                            >
                                                {log.endpoint?.url}
                                            </a>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(log.status)}>
                                            {log.status}
                                        </Badge>
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
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {!isLoading && logs.length > 0 && (
                    <div className="mt-3">
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    )
}
