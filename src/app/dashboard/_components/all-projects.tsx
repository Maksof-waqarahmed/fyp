import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CircleChevronRight, SquarePen, Trash2 } from "lucide-react";
import { Project } from "./create-project";
import { Pagination } from "./pagination";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";

interface AllProjectsProps {
  allProject: Project[];
  totalPages: number;
  totalProjects: number;
  page: number;
}

export function AllProjects({ allProject, totalPages, page }: AllProjectsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)


  const changePage = (page: number) => {
    console.log(page);
  };
  console.log({ page, totalPages })
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


      <div className="mt-4">
        <Table className="w-full overflow-hidden rounded-sm border bg-white shadow-sm">
          {/* Header */}
          <TableHeader className="bg-gradient-to-r from-zinc-950 from-[65%] to-blue-500/40">
            <TableRow className="border-none">
              <TableHead className="text-white font-semibold">Name</TableHead>
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

          {/* Body */}
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

                  {/* Description with max width + ellipsis */}
                  <TableCell className="max-w-[500px] truncate text-muted-foreground">
                    {project.description || "N/A"}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>

                  <TableCell className="text-right space-x-2 w-[100px]">
                    <Button size="icon" variant="ghost" onClick={() => {
                      setIsDeleteOpen(true)
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={() => setIsEditOpen(true)}>
                      <SquarePen className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <CircleChevronRight className="h-4 w-4" />
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
                  No projects created yet. Start by creating your first project!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>


        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />
        </div>

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
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  // delete logic yahan
                  setIsDeleteOpen(false)
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>

            <Field>
              <FieldLabel htmlFor="input-field-username">Name</FieldLabel>
              <Input placeholder="Project Name" />

              <FieldLabel htmlFor="input-field-description">Description</FieldLabel>
              <Input placeholder="Project Description" />
            </Field>

            <div className="flex justify-end gap-3">
              <Button type="submit">
                Update Project
              </Button>
              <Button onClick={() => setIsEditOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>


      </div>
    </div>
  );
}
