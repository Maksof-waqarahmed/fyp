"use client"
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Endpoint } from '@/types/endpoints.types'
import { Loader2, SquarePen, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'

export const EndPointsTable = ({ endpoints }: { endpoints: Endpoint[] }) => {

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedEndPoint, setSelectedEndPoint] = useState<Endpoint | null>(null);
    const [isPending, startTransition] = useTransition();

    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleDelete = () => {
        if (!selectedEndPoint) return;
        setIsDeleteOpen(false);
        setSelectedEndPoint(null);
    }

    return (
        <div className="w-full">
            <h1 className="text-3xl font-bold tracking-tight">All Endpoints</h1>

            <Card className="mt-4 p-3 px-6 rounded-sm gap-2 shadow-sm border bg-white">
                <CardTitle className="mb-2 text-lg font-semibold">
                    Filter
                </CardTitle>

                <div className="flex flex-col lg:flex-row gap-4 items-end">

                    {/* Project Name */}
                    <div className="flex flex-col w-full ">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">
                            Project Name
                        </label>
                        <Input
                            type="text"
                            placeholder="Search by project name..."
                        />
                    </div>

                    {/* From Date */}
                    <div className="flex flex-col w-full ">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">
                            From Date
                        </label>
                        <Input type="date" />
                    </div>

                    {/* To Date */}
                    <div className="flex flex-col w-full ">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">
                            To Date
                        </label>
                        <Input type="date" />
                    </div>
                </div>
                {/* Buttons */}
                <div className="flex justify-end mt-3">
                    <div className="flex gap-3">
                        <Button>
                            Apply
                        </Button>
                        <Button variant="outline">
                            Reset
                        </Button>
                    </div>
                </div>
            </Card>

            {/* ================= TABLE ================= */}

            <div className="mt-4">
                <Table className="w-full overflow-hidden rounded-sm border bg-white shadow-sm">
                    <TableHeader className="bg-gradient-to-r from-zinc-950 from-[65%] to-blue-500/40">
                        <TableRow className="border-none">
                            <TableHead className="text-white font-semibold">
                                Project Name
                            </TableHead>
                            <TableHead className="text-white font-semibold max-w-[500px]">
                                EndPoint Name
                            </TableHead>
                            <TableHead className="text-white font-semibold">
                                URL
                            </TableHead>
                            <TableHead className="text-white font-semibold max-w-[100px]">
                                Check Interval
                            </TableHead>
                            <TableHead className="text-white font-semibold max-w-[100px]">
                                Next Check
                            </TableHead>
                            <TableHead className="text-white font-semibold max-w-[100px]">
                                Last Status
                            </TableHead>
                            <TableHead className="text-white font-semibold max-w-[100px]">
                                Last Checked
                            </TableHead>
                            <TableHead className="text-white font-semibold max-w-[100px]">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {endpoints.length > 0 ? (
                            endpoints.map((endpoint) => (
                                <TableRow
                                    key={endpoint.id}
                                    className="transition-colors hover:bg-muted/50"
                                >
                                    <TableCell className="font-medium">
                                        {endpoint.project.projectName}
                                    </TableCell>

                                    <TableCell className="max-w-[500px] truncate text-muted-foreground">
                                        {endpoint.name}
                                    </TableCell>

                                    <TableCell className="text-sm text-muted-foreground">
                                        {endpoint.url}
                                    </TableCell>

                                    <TableCell className="text-sm text-muted-foreground">
                                        {endpoint.checkInterval}
                                    </TableCell>

                                    <TableCell className="text-sm text-muted-foreground">
                                        {endpoint.nextCheckAt?.toLocaleString()}
                                    </TableCell>

                                    <TableCell className="text-sm text-muted-foreground">
                                        {endpoint.lastStatus}
                                    </TableCell>

                                    <TableCell className="text-sm text-muted-foreground">
                                        {endpoint.lastCheckedAt?.toLocaleString()}
                                    </TableCell>

                                    <TableCell className="text-right space-x-2 w-[100px]">
                                        {/* DELETE */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectedEndPoint(endpoint);
                                                setIsDeleteOpen(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>

                                        {/* EDIT */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectedEndPoint(endpoint);
                                                setIsEditOpen(true);
                                            }}
                                        >
                                            <SquarePen className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="text-center py-12 text-muted-foreground"
                                >
                                    No projects created yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* <div className="mt-3">
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={changePage}
                    />
                </div> */}
            </div>

            {/* ================= DELETE DIALOG ================= */}

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete EndPoint</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold">
                                {selectedEndPoint?.name}
                            </span>
                            ?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteOpen(false);
                                setSelectedEndPoint(null);
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            {isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ================= EDIT DIALOG ================= */}

            {/* <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div>
                            <FieldLabel>Name</FieldLabel>
                            <Input
                                value={selectedProject?.projectName || ""}
                                onChange={(e) =>
                                    setSelectedProject((prev) =>
                                        prev
                                            ? { ...prev, projectName: e.target.value }
                                            : null
                                    )
                                }
                            />
                        </div>

                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <Input
                                value={selectedProject?.description || ""}
                                onChange={(e) =>
                                    setSelectedProject((prev) =>
                                        prev
                                            ? { ...prev, description: e.target.value }
                                            : null
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button onClick={handleUpdate}>
                            {isUpdating && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Update Project
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditOpen(false);
                                setSelectedProject(null);
                            }}
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog> */}
        </div>
    )
}
