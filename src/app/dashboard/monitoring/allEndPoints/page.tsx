import { api } from "@/trpc/trpc-server/server";
import { EndPointsTable } from "./_components/allEndPointsTable";

export default async function AllEndPoints() {
    const response = await api.endpoint.getAllEndPoints({
        page: 1,
        limit: 10,
    });

    const endpoints = response.data;

    return (
        <div>
            <EndPointsTable endpoints={endpoints} />
        </div>
    );
}

