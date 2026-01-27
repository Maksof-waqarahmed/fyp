import { api } from "@/trpc/trpc-server/server";
import CreateProject from "../../_components/create-project";


export default async function CreateProjectPage() {
  const projects = await api.project.getAllProjects({ page: "1", limit: "10" });
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Project</h1>
        <p className="text-muted-foreground">
          Create a new project to start monitoring your websites and APIs for uptime, availability, and performance.
        </p>
      </div>

      <div className="w-full">
        <CreateProject data={projects} />
      </div>
    </div>
  )
}
