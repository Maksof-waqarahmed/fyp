'use client'

import { zodResolver } from "@hookform/resolvers/zod";
import { endPointSchema } from "@/schemas/endpoint.schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Project } from "@/types/project.types";
import z from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { api } from "@/trpc/trpc-server/react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { History, Loader2, LoaderCircle, SquarePen, Trash2, Waypoints } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface EndPointsFormProps {
  project: Project;
}

export const EndPointsForm = ({ project }: EndPointsFormProps) => {

  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditEndPoints, setIsEditEndPoints] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    url: '',
    checkInterval: 5
  });

  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.ceil(project.endpoints.length / pageSize);

  const paginatedData = project.endpoints.slice(
    (page - 1) * pageSize,
    page * pageSize
  );


  const { mutateAsync: addEndPoints } = api.endpoint.addEndPoints.useMutation({
    onError: (error) => {
      console.error('API error:', error);
    },
    onSuccess: () => {
      toast.success('Endpoints added successfully');
      router.refresh();
      setIsEditEndPoints(false);
    },
  });

  const { mutateAsync: deleteEndPoint, isPending: isDeleting } = api.endpoint.deleteEndPoint.useMutation({
    onError: (error) => {
      toast.error(error.message || 'Failed to delete endpoint');
    },
    onSuccess: () => {
      toast.success('Endpoint deleted successfully');
      router.refresh();
      setIsDeleteOpen(false);
      setSelectedEndpoint(null);
    },
  });

  const { mutateAsync: updateEndPoint, isPending: isUpdating } = api.endpoint.updateEndPoint.useMutation({
    onError: (error) => {
      toast.error(error.message || 'Failed to update endpoint');
    },
    onSuccess: () => {
      toast.success('Endpoint updated successfully');
      router.refresh();
      setIsEditDialogOpen(false);
      setSelectedEndpoint(null);
    },
  });
  const form = useForm({
    resolver: zodResolver(endPointSchema),
    defaultValues: {
      projectID: project.id,
      projectName: project.projectName,
      endPoints: [
        { name: "", url: "", checkInterval: 5 }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "endPoints",
  });

  async function onSubmit(values: z.infer<typeof endPointSchema>) {
    await addEndPoints(values);

    form.reset({
      projectID: project.id,
      projectName: project.projectName,
      endPoints: [{ name: "", url: "", checkInterval: 5 }],
    });
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Project Name: <span className="text-xl font-semibold cursor-pointer hover:underline text-muted-foreground">{project.projectName}</span></h2>
        <p className="text-muted-foreground max-w-[800px] line-clamp-1">{project.description || "No description"}</p>
      </div>
      {/* Project Info Card */}
      <Card className="border shadow-sm rounded-lg">
        <CardContent className="space-y-1 md:px-6 px-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">

            <div className="flex items-center gap-4 p-5 rounded-2xl
                  bg-muted/40 backdrop-blur-md
                  border shadow-lg">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                <History />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="text-base font-semibold">
                  {new Date(project.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-2xl
                  bg-muted/40 backdrop-blur-md
                  border shadow-lg">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                <LoaderCircle />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated At</p>
                <p className="text-base font-semibold">
                  {new Date(project.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-2xl
                  bg-muted/40 backdrop-blur-md
                  border shadow-lg">
              <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400">
                <Waypoints />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Endpoints</p>
                <p className="text-xl font-bold">
                  {project._count.endpoints}
                </p>
              </div>
            </div>

          </div>

          <div className="w-full flex justify-end mt-3">
            <Button className="cursor-pointer" onClick={() => {
              setSelectedProject(project);
              setIsEditEndPoints(true);
            }}>
              Add Endpoints
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Endpoints Table */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Endpoints Overview</h2>
        {project.endpoints.length === 0 ? (
          <p className="text-muted-foreground">No endpoints added yet.</p>
        ) : (
          <div>
            <Table className="w-full border rounded-md shadow-sm overflow-hidden">
              <TableHeader className="bg-gradient-to-r from-zinc-950 from-[65%] to-blue-500/40">
                <TableRow>
                  <TableHead className="text-white font-semibold max-w-[500px]">Name</TableHead>
                  <TableHead className="text-white font-semibold">URL</TableHead>
                  <TableHead className="text-white font-semibold">Check Interval</TableHead>
                  <TableHead className="text-white font-semibold">Last Status</TableHead>
                  <TableHead className="text-white font-semibold">Last Checked</TableHead>
                  <TableHead className="text-white font-semibold max-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((ep) => (
                  <TableRow key={ep.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{ep.name}</TableCell>
                    <TableCell className="truncate max-w-[200px]">{ep.url}</TableCell>
                    <TableCell>{ep.checkInterval} min</TableCell>
                    <TableCell>{ep.lastStatus || "-"}</TableCell>
                    <TableCell>
                      {ep.lastCheckedAt ? new Date(ep.lastCheckedAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button className="cursor-pointer hover:bg-blue-500/40 duration-300 ease-in-out"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEndpoint(ep);
                          setEditFormData({
                            name: ep.name,
                            url: ep.url,
                            checkInterval: ep.checkInterval
                          });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <SquarePen className="h-4 w-4" />
                      </Button>
                      <Button className="cursor-pointer hover:bg-blue-500/40 duration-300 ease-in-out"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEndpoint(ep);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Delete Endpoint</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <span className="font-semibold">
                        {selectedEndpoint?.name}
                      </span>
                      ?
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDeleteOpen(false);
                        setSelectedEndpoint(null);
                      }}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (selectedEndpoint) {
                          await deleteEndPoint({ endpointID: selectedEndpoint.id });
                        }
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Table>

            <Pagination className="mt-4 justify-end">
              <PaginationContent>

                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => page > 1 && setPage(page - 1)}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={page === i + 1}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => page < totalPages && setPage(page + 1)}
                    className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

              </PaginationContent>
            </Pagination>

          </div>

        )}
        {
          isEditEndPoints && (
            <Dialog open={true} onOpenChange={(open) => {
              setIsEditEndPoints(open);
              if (!open) {
                form.reset({
                  projectID: project.id,
                  projectName: project.projectName,
                  endPoints: [{ name: "", url: "", checkInterval: 5 }],
                });
              }
            }} >
              <DialogContent className="px-6 ">
                <DialogHeader>
                  <DialogTitle>Add Endpoint</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card className="gap-0 py-3 rounded-sm ">
                      <CardContent className="md:px-6 px-3">
                        <div className="grid gap-5 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="projectName"
                            render={({ field }) => (
                              <div className="flex gap-2 items-baseline">
                                <h2 className="text-base font-semibold">Project Name:</h2>
                                <p className="text-sm text-muted-foreground">{field.value}</p>
                              </div>
                            )}
                          />
                        </div>

                        {/* Endpoints Form */}
                        <ScrollArea className="h-[270px] pr-2">
                          <div className="space-y-5 mt-4">
                            {fields.map((fieldItem, index) => (
                              <div key={fieldItem.id} className="flex md:flex-row flex-col gap-3 md:items-start md:border-0 border-b pb-2">
                                <FormField
                                  control={form.control}
                                  name={`endPoints.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Endpoint Name" />
                                      </FormControl>
                                      <div className="h-4 text-sm">
                                        <FormMessage />
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`endPoints.${index}.url`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>URL</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="https://example.com" />
                                      </FormControl>
                                      <div className="h-4 text-sm">
                                        <FormMessage />
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`endPoints.${index}.checkInterval`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Check Interval (minutes)</FormLabel>
                                      <FormControl>
                                        <Input type="number" min={5} step={1} {...field} placeholder="Interval" onChange={(e) => field.onChange(Number(e.target.value))} />
                                      </FormControl>
                                      <div className="h-4 text-sm">
                                        <FormMessage />
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                <div className="max-sm:w-full max-sm:flex justify-center md:mt-[26px]">
                                  <button
                                    type="button"
                                    disabled={fields.length === 1}
                                    className="rounded-full md:w-7 w-16 h-7 flex items-center justify-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed bg-red-600"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            ))}

                          </div>
                        </ScrollArea>
                        <div className="flex w-full gap-3 mt-6 justify-end">
                          <Button type="button" onClick={() => append({ name: "", url: "", checkInterval: 5 })}>
                            Add Endpoint
                          </Button>
                          <Button type="submit">Update Project</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

        {/* Edit Endpoint Dialog */}
        {isEditDialogOpen && (
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setSelectedEndpoint(null);
              setEditFormData({ name: '', url: '', checkInterval: 5 });
            }
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Endpoint</DialogTitle>
                <DialogDescription>
                  Update the details of your endpoint
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Endpoint name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">URL</label>
                  <Input
                    value={editFormData.url}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Check Interval (minutes)</label>
                  <Input
                    type="number"
                    min={5}
                    value={editFormData.checkInterval}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, checkInterval: Number(e.target.value) }))}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedEndpoint(null);
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>

                <Button
                  onClick={async () => {
                    if (selectedEndpoint) {
                      await updateEndPoint({
                        endpointID: selectedEndpoint.id,
                        name: editFormData.name,
                        url: editFormData.url,
                        checkInterval: editFormData.checkInterval
                      });
                    }
                  }}
                  disabled={isUpdating}
                >
                  {isUpdating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Endpoint
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
