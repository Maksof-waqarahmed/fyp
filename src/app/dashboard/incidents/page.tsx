import LogsIncidentsTabs from './_components/logs-incidents-tabs'
import { api } from '@/trpc/trpc-server/server'
import { Log } from '@/types/logs.types'

export default async function IncidentsPage() {
    const initialIncidentsData = await api.logs.getAllIncidentsTable({
        page: 1,
        limit: 10,
    })

    const initialLogsData = await api.logs.getAllLogs({
        page: 1,
        limit: 10,
    })

    // Serialize dates to strings for client component
    const serializedLogs: Log[] = initialLogsData.data.map(log => ({
        id: log.id,
        status: log.status,
        httpCode: log.httpCode,
        responseTime: log.responseTime,
        errorMessage: log.errorMessage,
        checkedAt: log.checkedAt.toISOString(),
        dnsStatus: log.dnsStatus,
        sslValid: log.sslValid,
        sslExpiry: log.sslExpiry?.toISOString() || null,
        endpoint: log.endpoint,
    }))

    return (
        <LogsIncidentsTabs
            initialIncidentsData={initialIncidentsData}
            initialLogsData={serializedLogs}
        />
    )
}