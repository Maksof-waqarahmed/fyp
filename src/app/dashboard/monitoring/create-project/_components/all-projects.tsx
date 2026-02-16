import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CircleChevronRight, SquarePen, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Project } from "./create-project";
import { Pagination } from "./pagination";
import { Card, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/trpc-server/react";
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import Link from "next/link";

interface AllProjectsProps {
  allProject: Project[];
  totalPages: number;
  totalProjects: number;
  page: number;
}

export function AllProjects({
  allProject,
  totalPages,
  page,
}: AllProjectsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { mutate: deleteProject, isPending } =
    api.project.deleteProject.useMutation({
      onSuccess: () => {
        toast.success("Project Deleted Successfully");
        router.refresh();
        setIsDeleteOpen(false);
        setSelectedProject(null);
      },
      onError: (error) => {
        console.log('API error:', error)
      },
    });

  const router = useRouter();

  const { mutate: updateProject, isPending: isUpdating } =
    api.project.editProject.useMutation({
      onSuccess: () => {
        toast.success("Project Updated Successfully");
        router.refresh();
        setIsEditOpen(false);
        setSelectedProject(null);
      },
      onError: (error) => {
        console.log('API error:', error)
      },
    });

  const changePage = (page: number) => {
    console.log("Page:", page);
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    deleteProject({ projectID: selectedProject.id });
  };

  const handleUpdate = () => {
    if (!selectedProject) return;
    const payload = {
      projectID: selectedProject.id,
      description: selectedProject.description || "",
      projectName: selectedProject.projectName || ""
    }
    updateProject(payload);
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>

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
                Name
              </TableHead>
              <TableHead className="text-white font-semibold max-w-[500px]">
                Description
              </TableHead>
              <TableHead className="text-white font-semibold">
                Created Date
              </TableHead>
              <TableHead className="text-white font-semibold max-w-[100px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {allProject.length > 0 ? (
              allProject.map((project) => (
                <TableRow
                  key={project.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {project.projectName}
                  </TableCell>

                  <TableCell className="max-w-[500px] truncate text-muted-foreground">
                    {project.description || "N/A"}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>

                  <TableCell className="text-right space-x-2 w-[100px]">
                    {/* DELETE */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedProject(project);
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
                        setSelectedProject(project);
                        setIsEditOpen(true);
                      }}
                    >
                      <SquarePen className="h-4 w-4" />
                    </Button>

                    <Link href={`/dashboard/monitoring/addEndpoints/${project.id}`}>
                      <Button size="icon" variant="ghost">
                        <CircleChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
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

        <div className="mt-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={changePage}
          />
        </div>
      </div>

      {/* ================= DELETE DIALOG ================= */}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {selectedProject?.projectName}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedProject(null);
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
      </Dialog>
    </div>
  );
}
