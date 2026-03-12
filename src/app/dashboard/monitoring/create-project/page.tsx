import { api } from "@/trpc/trpc-server/server";
import CreateProject from "./_components/create-project";

export default async function CreateProjectPage() {
  const projects = await api.project.getRecentProjects();

  return (
    <div className="space-y-6 w-full">
      <div className="w-full">
        <CreateProject {...projects} />
      </div>
    </div>
  )
}
