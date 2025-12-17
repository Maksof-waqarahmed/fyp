import TableLogs from "@/components/table";
import TerminalComp from "@/components/terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc-server/server";
import { Search } from "lucide-react";

export default async function LogsPage() {

  const data = await api.monitor.getAllMonitors() || [];

  return (
    <div className="min-h-screen">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">Logs</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or URL..."
                className="pl-10 w-80 bg-card"
              />
            </div>
            <div className="flex gap-2">
              {["ALL", "UP", "DOWN", "ERROR"].map((level) => (
                <Button
                  key={level}
                  variant={"ALL" === level ? "default" : "outline"}
                  size="sm"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Terminal-style Log Display */}
        <TerminalComp data={data.slice(0, 5)} />

        {/* Logs Table */}
        <TableLogs data={data} />

      </div>
    </div>
  )
}
