"use client"

import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/trpc/trpc-server/react"
import {
    AlertCircle, CheckCircle2, Clock, ExternalLink, Globe, Loader2,
    Server, Shield, Wifi,
} from "lucide-react"

interface Props {
    logId: string | null
    onClose: () => void
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "UP": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
        case "DOWN": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
        case "REDIRECT": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
        case "CLIENT_ERROR": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
        default: return "bg-muted text-muted-foreground border-border"
    }
}

function Field({
    label, value, mono = false,
}: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`text-sm ${mono ? "font-mono" : ""}`}>{value ?? "—"}</p>
        </div>
    )
}

export function LogDetailDialog({ logId, onClose }: Props) {
    const { data, isLoading } = api.logs.getLog.useQuery(
        { logId: logId! },
        { enabled: !!logId }
    )

    return (
        <Dialog open={!!logId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Log Detail</DialogTitle>
                    <DialogDescription>
                        Full snapshot of this monitoring check
                    </DialogDescription>
                </DialogHeader>

                {isLoading || !data?.data ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Top: status + endpoint */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b">
                            <div className="min-w-0">
                                <p className="font-semibold">{data.data.endpoint?.name}</p>
                                <p className="text-xs text-muted-foreground">{data.data.endpoint?.project?.projectName}</p>
                                <a
                                    href={data.data.endpoint?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                >
                                    {data.data.endpoint?.url}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <Badge className={getStatusColor(data.data.status) + " shrink-0"}>
                                {data.data.status}
                            </Badge>
                        </div>

                        {/* Timing & HTTP */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <Field
                                    label="Checked at"
                                    value={new Date(data.data.checkedAt).toLocaleString()}
                                />
                            </div>
                            <div className="flex items-start gap-2">
                                <Server className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <Field
                                    label="HTTP Code"
                                    value={data.data.httpCode ?? "—"}
                                    mono
                                />
                            </div>
                            <div className="flex items-start gap-2">
                                <Wifi className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <Field
                                    label="Response time"
                                    value={data.data.responseTime ? `${data.data.responseTime} ms` : "—"}
                                    mono
                                />
                            </div>
                        </div>

                        {/* Network details */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Network
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <Field
                                        label="DNS"
                                        value={
                                            <Badge
                                                className={
                                                    data.data.dnsStatus === "RESOLVED"
                                                        ? "bg-green-100 text-green-800 border-green-200"
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                }
                                            >
                                                {data.data.dnsStatus}
                                            </Badge>
                                        }
                                    />
                                </div>
                                <Field label="IP Address" value={data.data.ip ?? "—"} mono />
                                <div className="flex items-start gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <Field
                                        label="SSL"
                                        value={
                                            <Badge
                                                className={
                                                    data.data.sslValid
                                                        ? "bg-green-100 text-green-800 border-green-200"
                                                        : "bg-red-100 text-red-800 border-red-200"
                                                }
                                            >
                                                {data.data.sslValid ? "Valid" : "Invalid"}
                                            </Badge>
                                        }
                                    />
                                </div>
                                {data.data.sslExpiry && (
                                    <Field
                                        label="SSL Expiry"
                                        value={new Date(data.data.sslExpiry).toLocaleString()}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        {(data.data.contentHash || data.data.contentLength) && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Content
                                </p>
                                <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg">
                                    <Field
                                        label="Content Length"
                                        value={data.data.contentLength?.toLocaleString() ?? "—"}
                                        mono
                                    />
                                    <Field
                                        label="Content Hash (SHA-256)"
                                        value={
                                            data.data.contentHash ? (
                                                <span className="text-[10px] break-all">{data.data.contentHash}</span>
                                            ) : "—"
                                        }
                                        mono
                                    />
                                </div>
                            </div>
                        )}

                        {/* Anomaly indicator */}
                        {data.data.isAnomaly && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-semibold text-amber-900">Performance Anomaly Detected</p>
                                    <p className="text-xs text-amber-800 mt-0.5">
                                        Response time was significantly slower than the 7-day baseline (z-score &gt; 2).
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Error message */}
                        {data.data.errorMessage && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Error
                                </p>
                                <pre className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                                    {data.data.errorMessage}
                                </pre>
                            </div>
                        )}

                        {/* Healthy banner if no errors */}
                        {!data.data.errorMessage && data.data.status === "UP" && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <p className="text-sm text-green-900">
                                    Endpoint responded successfully — no errors detected.
                                </p>
                            </div>
                        )}

                        {/* Raw JSON expandable */}
                        <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                                View raw log JSON
                            </summary>
                            <pre className="mt-2 bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[10px]">
                                {JSON.stringify(data.data, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
