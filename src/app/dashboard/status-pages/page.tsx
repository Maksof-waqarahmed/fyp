import { api } from '@/trpc/trpc-server/server'
import { StatusPagesList } from './_components/status-pages-list'

const Page = async () => {
    const [statusPages, projects] = await Promise.all([
        api.statusPage.getAll(),
        api.project.getAllProjects({ page: 1, limit: 100 }),
    ])

    const projectOptions = projects.data.map(p => ({
        id: p.id,
        projectName: p.projectName,
        _count: { endpoints: p._count.endpoints },
    }))

    return (
        <div className="px-6 py-6">
            <StatusPagesList
                initialPages={statusPages.data}
                projects={projectOptions}
            />
        </div>
    )
}

export default Page
