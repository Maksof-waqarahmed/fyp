import AddUrlsForm from "../../_components/add-urls-form";


export default async function AddMonitor() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Monitor</h1>
        <p className="text-muted-foreground">Set up a new URL monitor to track uptime and performance</p>
      </div>

      <div className="w-full">
        <AddUrlsForm />
      </div>
    </div>
  )
}
