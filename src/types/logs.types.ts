import { HTTPStatus, DNSStatus } from "../../prisma/generated/prisma/enums"

// Log with Endpoint and Project Info
export interface Log {
    id: string
    status: HTTPStatus
    httpCode: number | null
    responseTime: number | null
    errorMessage: string | null
    checkedAt: string
    dnsStatus: DNSStatus
    sslValid: boolean
    sslExpiry: string | null
    endpoint: {
        id: string
        name: string
        url: string
        project: {
            id: string
            projectName: string
        }
    }
}

// Legacy Logs interface (for backward compatibility)
export interface Logs {
    id: string
    status: string
    httpCode: number | null
    responseTime: number | null
    errorMessage: string | null
    checkedAt: Date
    dnsStatus: string
    sslValid: boolean
    endpoint: {
        name: string
        url: string
    } | null
}

// Pagination Info
export interface PaginationInfo {
    total: number
    page: number
    limit: number
    totalPages: number
}

// Get All Logs Response
export interface GetAllLogsResponse {
    data: Log[]
    pagination: PaginationInfo
}

// Log Filters
export interface LogFilters {
    page?: number
    limit?: number
    status?: "UP" | "DOWN"
    dnsStatus?: "RESOLVED" | "FAILED"
    projectName?: string
    endpointName?: string
    startDate?: Date
    endDate?: Date
    sslValid?: boolean
    sortBy?: "checkedAt" | "responseTime" | "httpCode"
    sortOrder?: "asc" | "desc"
}
