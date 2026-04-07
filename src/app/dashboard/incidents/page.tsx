import IncidentTable from './_components/incident-table'
import { api } from '@/trpc/trpc-server/server'

export default async function IncidentsPage() {
    const initialData = await api.logs.getAllIncidentsTable({
        page: 1,
        limit: 10,
    })

    return <IncidentTable initialData={initialData} />
}