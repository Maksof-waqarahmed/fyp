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

interface EndPointsFormProps {
  project: Project;
}

export const EndPointsForm = ({ project }: EndPointsFormProps) => {

  const router = useRouter();

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
    <div className="p-6 space-y-6">
      {/* Project Info Card */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Project Name: {project.projectName}</CardTitle>
          <CardDescription>Project Description: {project.description || "No description"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <p>
            <span className="font-semibold">Created At:</span>{" "}
            {new Date(project.createdAt).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Updated At:</span>{" "}
            {new Date(project.updatedAt).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Endpoints Count:</span>{" "}
            {project._count.endpoints}
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Project Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="gap-0 py-3 rounded-sm">
            <CardContent>
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
              <div className="space-y-3 mt-4">
                {fields.map((fieldItem, index) => (
                  <div key={fieldItem.id} className="grid gap-3 md:grid-cols-3 items-end">
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
                    <Button type="button" variant="destructive" className="mt-2" onClick={() => remove(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" onClick={() => append({ name: "", url: "", checkInterval: 1 })}>
                  Add Endpoint
                </Button>
              </div>

              <div className="flex w-full gap-4 mt-6 justify-end">
                <Button type="submit">Update Project</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      <Separator />

      {/* Endpoints Table */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Endpoints Overview</h2>
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
      </div>
    </div>
  );
}
