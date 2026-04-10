import LogsIncidentsTabs from './_components/logs-incidents-tabs'
import { api } from '@/trpc/trpc-server/server'

export default async function IncidentsPage() {
    const initialIncidentsData = await api.logs.getAllIncidentsTable({
        page: 1,
        limit: 10,
    })

    const initialLogsData = await api.logs.getAllLogs({
        page: 1,
        limit: 10,
    })

    return (
        <LogsIncidentsTabs
            initialIncidentsData={initialIncidentsData}
            initialLogsData={initialLogsData.data || []}
        />
    )
}