"use client"

import { api } from "@/trpc/trpc-server/react"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Search,
    Loader2,
    Eye
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Pagination } from "../../monitoring/create-project/_components/pagination"

interface Incident {
    id: string
    endpointId: string
    endpointName: string
    endpointUrl: string
    projectName: string
    status: "ongoing" | "resolved"
    rootCause: string | null
    startedAt: string
    resolvedAt: string | null
    durationMs: number
    httpCode: number | null
}

interface IncidentTableProps {
    initialData: {
        incidents: Incident[]
        total: number
        page: number
        totalPages: number
        summary: {
            total: number
            ongoing: number
            resolved: number
            avgDowntimeMs: number
        }
    }
}

export default function IncidentTable({ initialData }: IncidentTableProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "ongoing" | "resolved">("all")
    const [page, setPage] = useState(1)
    const limit = 10

    // Use client-side query only when filters change
    const { data, isLoading } = api.logs.getAllIncidentsTable.useQuery(
        {
            page,
            limit,
            status: statusFilter === "all" ? undefined : statusFilter,
            search: searchQuery || undefined,
        },
        {
            // Use initial data for first render
            initialData: page === 1 && !searchQuery && statusFilter === "all" ? initialData : undefined,
        }
    )

    const incidents = (data?.incidents ?? initialData.incidents) as Incident[]
    const totalPages = data?.totalPages ?? initialData.totalPages
    const summary = data?.summary ?? initialData.summary

    const formatDuration = (ms: number): string => {
        const hours = Math.floor(ms / (1000 * 60 * 60))
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
        if (hours > 0) return `${hours}h ${minutes}m`
        if (minutes > 0) return `${minutes}m`
        return "< 1m"
    }

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
                    <p className="text-muted-foreground mt-1">Monitor and track all endpoint incidents</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <CardTitle>Filter</CardTitle>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by endpoint name, URL, or project..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Incidents Table */}
            <div className="mt-4">
                <Table className="w-full overflow-hidden rounded-sm border bg-white shadow-sm">
                    <TableHeader className="bg-gradient-to-r from-zinc-950 from-[65%] to-blue-500/40">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="text-white font-semibold">Status</TableHead>
                            <TableHead className="text-white font-semibold">Monitor</TableHead>
                            <TableHead className="text-white font-semibold">Root Cause</TableHead>
                            <TableHead className="text-white font-semibold">Started</TableHead>
                            <TableHead className="text-white font-semibold">Resolved</TableHead>
                            <TableHead className="text-white font-semibold">Duration</TableHead>
                            <TableHead className="text-white font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="p-12 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : incidents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="p-12 text-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                    <p className="text-lg font-semibold text-muted-foreground">
                                        {searchQuery || statusFilter !== "all" ? "No incidents found" : "No incidents"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "All endpoints are running smoothly"}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            incidents.map((incident) => (
                                <TableRow key={incident.id} className="transition-colors hover:bg-muted/50">
                                    <TableCell>
                                        {incident.status === "ongoing" ? (
                                            <Badge className="bg-red-100 text-red-800 border-red-200">
                                                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-1" />
                                                Ongoing
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Resolved
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{incident.endpointName}</p>
                                            <p className="text-xs text-muted-foreground">{incident.projectName}</p>
                                            <a
                                                href={incident.endpointUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                                            >
                                                {incident.endpointUrl.slice(0, 40)}...
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <p className="text-sm truncate">{incident.rootCause || "Unknown error"}</p>
                                        {incident.httpCode && (
                                            <Badge variant="outline" className="text-xs mt-1">
                                                HTTP {incident.httpCode}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(incident.startedAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : "—"}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {formatDuration(incident.durationMs)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/dashboard/incidents/${incident.endpointId}`}>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="cursor-pointer hover:bg-blue-500/40 duration-300 ease-in-out"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {!isLoading && incidents.length > 0 && (
                    <div className="mt-3">
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    )
}
