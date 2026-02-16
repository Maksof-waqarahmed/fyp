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