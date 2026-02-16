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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EndPointsFormProps {
  project: Project;
}

export const EndPointsForm = ({ project }: EndPointsFormProps) => {

  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditEndPoints, setIsEditEndPoints] = useState(false);

  const { mutateAsync: addEndPoints } = api.endpoint.addEndPoints.useMutation({
    onError: (error) => {
      console.error('API error:', error);
    },
    onSuccess: () => {
      toast.success('Endpoints added successfully');
      router.refresh();
    },

  });
  const form = useForm({
    resolver: zodResolver(endPointSchema),
    defaultValues: {
      projectID: project.id,
      projectName: project.projectName,
      endPoints: [
        { name: "", url: "", checkInterval: 1 }
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
      endPoints: [{ name: "", url: "", checkInterval: 1 }],
    });
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Project Name: <span className="text-2xl font-semibold cursor-pointer hover:underline text-muted-foreground">{project.projectName}</span></h2>
        <p className="text-muted-foreground max-w-[800px] line-clamp-1">{project.description || "No description"}</p>
      </div>
      {/* Project Info Card */}
      <Card className="border shadow-sm rounded-lg">
        <CardContent className="space-y-1 md-:px-6 px-3">
          <div className="flex md:flex-row flex-col gap-5">
            <div className="p-3 bg-zinc-700/60 rounded-full text-white">
              <p>
                <span className="font-semibold text-lg">Created At:</span>{" "}
                {new Date(project.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-zinc-500/60 rounded-full text-white">
              <p>
                <span className="font-semibold text-lg">Updated At:</span>{" "}
                {new Date(project.updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-zinc-400/55 rounded-full text-white">
              <p>
                <span className="font-semibold text-lg">Endpoints Count:</span>{" "}
                {project._count.endpoints}
              </p>
            </div>
          </div>
          <div className="w-full flex justify-end">
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
        <h2 className="text-3xl font-bold mb-2">Endpoints Overview</h2>
        {project.endpoints.length === 0 ? (
          <p className="text-muted-foreground">No endpoints added yet.</p>
        ) : (
          <Table className="w-full border rounded-md shadow-sm overflow-hidden">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Check Interval</TableHead>
                <TableHead>Last Status</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.endpoints.map((ep) => (
                <TableRow key={ep.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>{ep.name}</TableCell>
                  <TableCell className="truncate max-w-[200px]">{ep.url}</TableCell>
                  <TableCell>{ep.checkInterval} hour</TableCell>
                  <TableCell>{ep.lastStatus || "-"}</TableCell>
                  <TableCell>
                    {ep.lastCheckedAt ? new Date(ep.lastCheckedAt).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="icon" variant="outline">
                      ✏️
                    </Button>
                    <Button size="icon" variant="destructive">
                      🗑️
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isEditEndPoints} onOpenChange={setIsEditEndPoints} >
          <DialogContent className="px-6 ">
            <DialogHeader>
              <DialogTitle>Create Endpoint</DialogTitle>
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
                          <FormItem>
                            <FormLabel className="text-muted-foreground">Project Name</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Endpoints Form */}
                    <ScrollArea className="h-[270px] overflow-hidden">
                      <div className="space-y-3 mt-4">
                        {fields.map((fieldItem, index) => (
                          <div key={fieldItem.id} className="flex md:flex-row flex-col gap-3 md:items-end md:border-0 border-b">
                            <FormField
                              control={form.control}
                              name={`endPoints.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Endpoint Name" />
                                  </FormControl>
                                  <FormMessage />
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`endPoints.${index}.checkInterval`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Check Interval (hour)</FormLabel>
                                  <FormControl>
                                    <Input type="number" min={1} step={1} {...field} placeholder="Interval" onChange={(e) => field.onChange(Number(e.target.value))} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="max-sm:w-full max-sm:flex justify-center mb-2">
                              <button type="button" className="mt-2 rounded-full bg-red-600 md:w-7 w-16 h-7 flex items-center justify-center" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-white" />
                              </button>
                            </div>
                          </div>
                        ))}

                      </div>
                    </ScrollArea>
                    <div className="flex w-full gap-3 mt-6 justify-end">
                      <Button type="button" onClick={() => append({ name: "", url: "", checkInterval: 1 })}>
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
      </div>
    </div>
  );
}
