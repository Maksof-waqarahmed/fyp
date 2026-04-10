import { HTTPStatus } from "../../prisma/generated/prisma/enums"

// Incident Table Row
export interface Incident {
    id: string
    endpointId: string
    endpointName: string
    endpointUrl: string
    projectName: string
    status: "ongoing" | "resolved"
    rootCause: string | null
    startedAt: string
    resolvedAt: string | null
    durationMs: number
    httpCode: number | null
}

// Incident Summary
export interface IncidentSummary {
    total: number
    ongoing: number
    resolved: number
    avgDowntimeMs: number
}

// Get All Incidents Response
export interface GetAllIncidentsResponse {
    incidents: Incident[]
    total: number
    page: number
    totalPages: number
    summary: IncidentSummary
}

// Incident Detail - Activity Log Item
export interface IncidentActivityLog {
    id: string
    status: HTTPStatus
    httpCode: number | null
    errorMessage: string | null
    checkedAt: string
    responseTime: number | null
    dnsStatus: string
    ip: string | null
    sslValid: boolean
}

// Incident Detail - Endpoint Info
export interface IncidentEndpoint {
    id: string
    name: string
    url: string
    project: {
        id: string
        projectName: string
    }
}

// Incident Detail - Current Incident
export interface CurrentIncident {
    id: string
    status: "ongoing" | "resolved"
    startedAt: string
    recoveredAt: string | null
    downtimeMs: number
    triggerStatus: HTTPStatus
    errorMessage: string | null
    httpCode: number | null
}

// Get Incident Detail Response
export interface GetIncidentDetailResponse {
    endpoint: IncidentEndpoint
    currentIncident: CurrentIncident | null
    activityLog: IncidentActivityLog[]
}

// Endpoints with Incident Count
export interface EndpointWithIncidentCount {
    id: string
    name: string
    url: string
    projectName: string
    totalIncidents: number
    ongoingIncidents: number
}
