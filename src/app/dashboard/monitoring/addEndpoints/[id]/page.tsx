import { api } from "@/trpc/trpc-server/server";
import { Project } from "@/types/project.types";
import { EndPointsForm } from "../_components/addEndpoints";

const AddEndPoints = async ({
    params,
}: {
    params: Promise<{ id: string }>;
}) => {
    const { id } = await params;
    const { data: rawData } = await api.project.getProject({ projectID: id });

    const data: Project = {
        ...rawData,
        description: rawData.description || "",
        createdAt: rawData.createdAt.toISOString(),
        updatedAt: rawData.updatedAt.toISOString(),
        endpoints: rawData.endpoints.map((ep) => ({
            ...ep,
            createdAt: ep.createdAt.toISOString(),
            lastCheckedAt: ep.lastCheckedAt ? ep.lastCheckedAt.toISOString() : null,
        })),
    };

    return (
        <>
            <EndPointsForm project={data} />
        </>
    );
};

export default AddEndPoints;
