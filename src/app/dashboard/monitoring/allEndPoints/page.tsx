import { api } from "@/trpc/trpc-server/server";
import { Endpoint } from "@/types/endpoints.types";
import { EndPointsTable } from "./_components/allEndPointsTable";

export default async function AllEndPoints() {
    const response = await api.endpoint.getAllEndPoints({
        page: 1,
        limit: 10,
    });

    // Serialize dates for client component
    const endpoints: Endpoint[] = response.data.map(endpoint => ({
        ...endpoint,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
        nextCheckAt: endpoint.nextCheckAt,
        lastCheckedAt: endpoint.lastCheckedAt,
        notifications: endpoint.notifications.map(notif => ({
            ...notif,
            sentAt: notif.sentAt,
            metadata: notif.metadata as Record<string, unknown> | null,
        })),
        logs: endpoint.logs.map(log => ({
            ...log,
            checkedAt: log.checkedAt,
            sslExpiry: log.sslExpiry,
        })),
    }));

    return (
        <div>
            <EndPointsTable endpoints={endpoints} />
        </div>
    );
}

