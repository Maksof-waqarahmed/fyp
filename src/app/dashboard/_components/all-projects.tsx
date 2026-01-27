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

interface AllProjectsProps {
  allProject: Project[];
  totalPages: number;
  totalProjects: number;
  page: number;
  limit: number;
}

export function AllProjects({ allProject, totalPages, totalProjects, page, limit }: AllProjectsProps) {
  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>

      <Card className="mt-4 p-4">
        <CardTitle>Filter</CardTitle>
      </Card>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allProject.length > 0 ? (
              allProject.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.projectName}</TableCell>
                  <TableCell>{project.description || "N/A"}</TableCell>
                  <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="space-x-3">
                    <Button size="sm" variant="outline">
                      <Trash2 />
                    </Button>
                    <Button size="sm" variant="outline">
                      <SquarePen />
                    </Button>
                    <Button size="sm" variant="outline">
                      <CircleChevronRight />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                  No projects created yet. Start by creating your first project!
                </td>
              </tr>
            )}
          </TableBody>
        </Table>

        <div className="mt-4">
          {/* <Pagination totalPages={totalPages} page={page} /> */}
        </div>
      </div>
    </div>
  );
}
