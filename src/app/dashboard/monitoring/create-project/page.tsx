import { api } from "@/trpc/trpc-server/server";
import CreateProject from "./_components/create-project";

interface CreateProjectPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CreateProjectPage({ searchParams }: CreateProjectPageProps) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;

  const projects = await api.project.getAllProjects({ page: currentPage, limit: 3 });

  return (
    <div className="space-y-6 w-full">
      <div className="w-full">
        <CreateProject {...projects} />
      </div>
    </div>
  )
}
