"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { api } from "@/trpc/trpc-server/react"
import { Activity, Globe, Loader2, TrendingDown, TrendingUp, Minus, BrainCircuit, Info } from "lucide-react"

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

function levelStyle(level: RiskLevel): string {
    switch (level) {
        case "CRITICAL": return "bg-red-500 text-white"
        case "HIGH": return "bg-orange-500 text-white"
        case "MEDIUM": return "bg-yellow-500 text-white"
        default: return "bg-green-500 text-white"
    }
}

function barColor(level: RiskLevel): string {
    switch (level) {
        case "CRITICAL": return "bg-red-500"
        case "HIGH": return "bg-orange-500"
        case "MEDIUM": return "bg-yellow-500"
        default: return "bg-green-500"
    }
}

function TrendIcon({ trend }: { trend: "improving" | "stable" | "degrading" }) {
    if (trend === "degrading") return <TrendingUp className="h-4 w-4 text-red-500" />
    if (trend === "improving") return <TrendingDown className="h-4 w-4 text-green-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
}

export default function PredictionsPage() {
    const { data, isLoading } = api.prediction.getAllRisks.useQuery(undefined, {
        refetchInterval: 60 * 1000,
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const endpoints = data ?? []
    const atRisk = endpoints.filter((e) => e.hasEnoughData && e.riskScore >= 45).length

    return (
        <div className="w-full space-y-6 pb-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-lg">
                    <BrainCircuit className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Predictive Health</h1>
                    <p className="text-sm text-muted-foreground">
                        Explainable failure-risk scoring &amp; response-time forecasting — statistical, no LLM
                    </p>
                </div>
                {atRisk > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white">{atRisk} endpoint{atRisk === 1 ? "" : "s"} at risk</Badge>
                )}
            </div>

            {endpoints.length === 0 ? (
                <Card className="p-12 text-center">
                    <Activity className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No endpoints yet</h3>
                    <p className="text-muted-foreground">Add endpoints under Monitoring — predictions build up as checks accumulate.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {endpoints.map((ep) => (
                        <Card key={ep.id} className="p-5 border-2">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <h3 className="font-bold truncate">{ep.name}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                        <Globe className="h-3 w-3 shrink-0" /> {ep.url}
                                    </p>
                                </div>
                                {ep.hasEnoughData ? (
                                    <Badge className={levelStyle(ep.riskLevel)}>{ep.riskLevel}</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                        <Info className="h-3 w-3 mr-1" /> Gathering data
                                    </Badge>
                                )}
                            </div>

                            {ep.hasEnoughData ? (
                                <>
                                    {/* Risk score bar */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl font-black tabular-nums w-12">{ep.riskScore}</span>
                                        <div className="flex-1">
                                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${barColor(ep.riskLevel)}`}
                                                    style={{ width: `${ep.riskScore}%` }}
                                                />
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">Failure risk score (0–100)</p>
                                        </div>
                                    </div>

                                    {/* Forecast */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <TrendIcon trend={ep.forecast.trend} /> {ep.forecast.trend}
                                        </span>
                                        {ep.forecast.currentResponseTime !== null && (
                                            <span>Now: <strong className="text-foreground">{ep.forecast.currentResponseTime}ms</strong></span>
                                        )}
                                        {ep.forecast.predictedResponseTimeIn24h !== null && (
                                            <span>Forecast 24h: <strong className="text-foreground">{ep.forecast.predictedResponseTimeIn24h}ms</strong></span>
                                        )}
                                    </div>

                                    {/* Explainable factors */}
                                    {ep.factors.length > 0 ? (
                                        <div className="space-y-1.5 pt-2 border-t">
                                            {ep.factors.map((f) => (
                                                <div key={f.name} className="flex items-start justify-between gap-3 text-xs">
                                                    <div className="min-w-0">
                                                        <span className="font-medium">{f.name}</span>
                                                        <p className="text-muted-foreground">{f.detail}</p>
                                                    </div>
                                                    <span className="shrink-0 font-mono text-muted-foreground">+{f.points}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-green-600 dark:text-green-400 pt-2 border-t">
                                            ✓ No risk factors detected — endpoint looks healthy.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Need at least 10 checks before a reliable prediction can be made.
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
