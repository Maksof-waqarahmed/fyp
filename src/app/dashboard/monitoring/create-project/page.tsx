import AddUrlsForm from "../../_components/add-urls-form";
import CreateProject from "../../_components/create-project";


export default async function AddMonitor() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Project</h1>
        <p className="text-muted-foreground">Create a new project to start monitoring your websites and APIs for uptime, availability, and performance.</p>
      </div>

      <div className="w-full">
        <CreateProject />
      </div>
    </div>
  )
}
