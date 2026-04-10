import { AlertStatus, DNSStatus, HTTPStatus } from "../../prisma/generated/prisma/enums";

export interface Project {
    id: string;
    projectName: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface EndpointLog {
    id: string;
    status: HTTPStatus;
    responseTime: number | null;
    checkedAt: Date;
    errorMessage: string | null;
    httpCode: number | null;
    sslExpiry: Date | null;
    sslValid: boolean;
    ip: string | null;
    dnsStatus: DNSStatus;
    contentHash: string | null;
    contentLength: number | null;
}

export type NotificationMetadata = Record<string, unknown> | null;

export interface Notification {
    id: string;
    type: string;
    message: string;
    sentAt: Date | null;
    status: AlertStatus;
    metadata: NotificationMetadata;
}

export interface Endpoint {
    id: string;
    name: string;
    url: string;
    checkInterval: number;
    nextCheckAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    lastStatus: HTTPStatus | null;
    lastCheckedAt: Date | null;

    project: Project;
    notifications: Notification[];
    logs: EndpointLog[];
}

export interface GetAllEndpointsResponse {
    message: string;
    data: Endpoint[];
    total: number;
    page: number;
    totalPages: number;
}
