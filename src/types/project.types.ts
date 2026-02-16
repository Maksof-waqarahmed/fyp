export interface Endpoint {
    id: string;
    name: string;
    url: string;
    checkInterval: number;
    lastStatus: string | null;
    lastCheckedAt: string | null;
    createdAt: string;
}

export interface Project {
    id: string;
    projectName: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    endpoints: Endpoint[];
    _count: { endpoints: number };
}
