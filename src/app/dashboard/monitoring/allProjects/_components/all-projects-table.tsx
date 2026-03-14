"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/trpc/trpc-server/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "../../create-project/_components/pagination"
import {
    ChevronDown, ChevronRight, Loader2, SquarePen, Trash2, CircleChevronRight,
} from "lucide-react"
import Link from "next/link"

type HTTPStatus = "UP" | "REDIRECT" | "CLIENT_ERROR" | "DOWN" | "UNKNOWN"

interface Project {
    id: string
    projectName: string
    description: string | null
    createdAt: Date
    updatedAt: Date
    _count: { endpoints: number }
}

interface Endpoint {
    id: string
    name: string
    url: string
    checkInterval: number
    lastStatus: HTTPStatus | null
    lastCheckedAt: Date | null
    nextCheckAt: Date | null
    createdAt: Date
}

function statusBadge(status: HTTPStatus | null) {
    if (!status) return <Badge variant="secondary">Unknown</Badge>
    const map: Record<HTTPStatus, { label: string; className: string }> = {
        UP: { label: "UP", className: "bg-green-100 text-green-800 border-green-200" },
        REDIRECT: { label: "REDIRECT", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
        CLIENT_ERROR: { label: "CLIENT ERR", className: "bg-orange-100 text-orange-800 border-orange-200" },
        DOWN: { label: "DOWN", className: "bg-red-100 text-red-800 border-red-200" },
        UNKNOWN: { label: "UNKNOWN", className: "bg-gray-100 text-gray-700 border-gray-200" },
    }
    const { label, className } = map[status]
    return <Badge variant="outline" className={className}>{label}</Badge>
}

function ExpandedEndpoints({ projectId }: { projectId: string }) {
    const { data, isLoading } = api.endpoint.getEndpointsByProject.useQuery({ projectId })

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 py-4 px-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading endpoints...
            </div>
        )
    }

    const endpoints: Endpoint[] = data?.data ?? []

    if (endpoints.length === 0) {
        return (
            <div className="py-4 px-6 text-sm text-muted-foreground italic">
                No endpoints found for this project.
            </div>
        )
    }

    return (
        <div className="px-6 pb-4 pt-2 bg-zinc-50 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Endpoints</p>
            <Table className="rounded border overflow-hidden text-sm">
                <TableHeader className="bg-zinc-100">
                    <TableRow className="border-none">
                        <TableHead className="text-zinc-700 font-semibold">Name</TableHead>
                        <TableHead className="text-zinc-700 font-semibold">URL</TableHead>
                        <TableHead className="text-zinc-700 font-semibold">Interval (h)</TableHead>
                        <TableHead className="text-zinc-700 font-semibold">Last Status</TableHead>
                        <TableHead className="text-zinc-700 font-semibold">Last Checked</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {endpoints.map((ep) => (
                        <TableRow key={ep.id} className="hover:bg-zinc-100/60">
                            <TableCell className="font-medium">{ep.name}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[260px] truncate">{ep.url}</TableCell>
                            <TableCell className="text-muted-foreground">{ep.checkInterval}h</TableCell>
                            <TableCell>{statusBadge(ep.lastStatus)}</TableCell>
                            <TableCell className="text-muted-foreground">
                                {ep.lastCheckedAt ? new Date(ep.lastCheckedAt).toLocaleString() : "Never"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export function AllProjectsTable() {
    const router = useRouter()

    const [page, setPage] = useState(1)
    const [searchInput, setSearchInput] = useState("")
    const [fromDateInput, setFromDateInput] = useState("")
    const [toDateInput, setToDateInput] = useState("")

    const [appliedFilters, setAppliedFilters] = useState({
        search: "", fromDate: "", toDate: "",
    })

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)

    const { data, isLoading, refetch } = api.project.getAllProjects.useQuery({
        page,
        limit: 10,
        search: appliedFilters.search || undefined,
        fromDate: appliedFilters.fromDate || undefined,
        toDate: appliedFilters.toDate || undefined,
    })

    const { mutate: deleteProject, isPending: isDeleting } = api.project.deleteProject.useMutation({
        onSuccess: () => {
            toast.success("Project deleted successfully")
            setIsDeleteOpen(false)
            setSelectedProject(null)
            refetch()
        },
    })

    const { mutate: updateProject, isPending: isUpdating } = api.project.editProject.useMutation({
        onSuccess: () => {
            toast.success("Project updated successfully")
            setIsEditOpen(false)
            setSelectedProject(null)
            refetch()
        },
    })

    const projects: Project[] = data?.data ?? []
    const totalPages = data?.totalPages ?? 1

    const applyFilters = () => {
        setPage(1)
        setAppliedFilters({ search: searchInput, fromDate: fromDateInput, toDate: toDateInput })
    }

    const resetFilters = () => {
        setSearchInput("")
        setFromDateInput("")
        setToDateInput("")
        setPage(1)
        setAppliedFilters({ search: "", fromDate: "", toDate: "" })
    }

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>

            {/* ===== FILTER ===== */}
            <Card className="mt-4 p-3 px-6 rounded-sm gap-2 shadow-sm border bg-white">
                <CardTitle className="mb-2 text-lg font-semibold">Filter</CardTitle>
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex flex-col w-full">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">Project Name</label>
                        <Input
                            type="text"
                            placeholder="Search by project name..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                        />
                    </div>
                    <div className="flex flex-col w-full">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">From Date</label>
                        <Input type="date" value={fromDateInput} onChange={(e) => setFromDateInput(e.target.value)} />
                    </div>
                    <div className="flex flex-col w-full">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">To Date</label>
                        <Input type="date" value={toDateInput} onChange={(e) => setToDateInput(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end mt-3 gap-3">
                    <Button className="cursor-pointer" onClick={applyFilters}>Apply</Button>
                    <Button variant="outline" className="cursor-pointer" onClick={resetFilters}>Reset</Button>
                </div>
            </Card>

            {/* ===== TABLE ===== */}
            <div className="mt-4">
                <Table className="w-full overflow-hidden rounded-sm border bg-white shadow-sm">
                    <TableHeader className="bg-gradient-to-r from-zinc-950 from-[65%] to-blue-500/40">
                        <TableRow className="border-none">
                            <TableHead className="w-10" />
                            <TableHead className="text-white font-semibold">Name</TableHead>
                            <TableHead className="text-white font-semibold max-w-[400px]">Description</TableHead>
                            <TableHead className="text-white font-semibold">Endpoints</TableHead>
                            <TableHead className="text-white font-semibold">Created</TableHead>
                            <TableHead className="text-white font-semibold w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : projects.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    No projects found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            projects.map((project) => (
                                <>
                                    <TableRow
                                        key={project.id}
                                        className="transition-colors hover:bg-muted/50 cursor-pointer"
                                        onClick={() => toggleRow(project.id)}
                                    >
                                        <TableCell className="w-10 text-muted-foreground">
                                            {expandedRows.has(project.id)
                                                ? <ChevronDown className="h-4 w-4" />
                                                : <ChevronRight className="h-4 w-4" />}
                                        </TableCell>
                                        <TableCell className="font-medium">{project.projectName}</TableCell>
                                        <TableCell className="max-w-[400px] truncate text-muted-foreground">
                                            {project.description || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{project._count.endpoints}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="icon" variant="ghost"
                                                    className="cursor-pointer hover:bg-blue-500/20"
                                                    onClick={() => { setSelectedProject(project); setIsDeleteOpen(true) }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon" variant="ghost"
                                                    className="cursor-pointer hover:bg-blue-500/20"
                                                    onClick={() => { setSelectedProject(project); setIsEditOpen(true) }}
                                                >
                                                    <SquarePen className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {expandedRows.has(project.id) && (
                                        <TableRow key={`${project.id}-expanded`} className="hover:bg-transparent">
                                            <TableCell colSpan={6} className="p-0">
                                                <ExpandedEndpoints projectId={project.id} />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="mt-3">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            </div>

            {/* ===== DELETE DIALOG ===== */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold">{selectedProject?.projectName}</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setSelectedProject(null) }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => selectedProject && deleteProject({ projectID: selectedProject.id })}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== EDIT DIALOG ===== */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <FieldLabel>Name</FieldLabel>
                            <Input
                                value={selectedProject?.projectName || ""}
                                onChange={(e) => setSelectedProject((prev) => prev ? { ...prev, projectName: e.target.value } : null)}
                            />
                        </div>
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <Input
                                value={selectedProject?.description || ""}
                                onChange={(e) => setSelectedProject((prev) => prev ? { ...prev, description: e.target.value } : null)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            onClick={() => selectedProject && updateProject({
                                projectID: selectedProject.id,
                                projectName: selectedProject.projectName,
                                description: selectedProject.description || "",
                            })}
                            disabled={isUpdating}
                        >
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Project
                        </Button>
                        <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedProject(null) }}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
