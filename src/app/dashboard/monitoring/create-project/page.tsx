import { api } from "@/trpc/trpc-server/server";
import CreateProject from "./_components/create-project";

export default async function CreateProjectPage() {
  const projects = await api.project.getAllProjects({ page: 1, limit: 3 });
  return (
    <div className="space-y-6 w-full">

      <div className="w-full">
        <CreateProject {...projects} />
      </div>
    </div>
  )
}
