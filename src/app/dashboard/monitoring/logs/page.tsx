import { api } from "@/trpc/trpc-server/server";
import TableLogs from "./_components/logTable";

export default async function LogsPage() {
  const { data } = await api.logs.getAllLogs({ page: 1, limit: 10 })

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <TableLogs data={data || []} />
      </div>
    </div>
  )
}
