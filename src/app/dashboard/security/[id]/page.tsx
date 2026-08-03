"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/trpc/trpc-server/react"
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ExternalLink,
    Globe,
    Loader2,
    ScanLine,
    ShieldAlert,
    Sparkles,
    Wand2,
    XCircle,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
type Finding = { id: string; title: string; severity: Severity; passed: boolean; detail: string; recommendation?: string }
type CategoryResult = { category: string; findings: Finding[] }

function gradeColor(grade: string): string {
    switch (grade) {
        case "A": return "bg-green-500 text-white"
        case "B": return "bg-lime-500 text-white"
        case "C": return "bg-yellow-500 text-white"
        case "D": return "bg-orange-500 text-white"
        default: return "bg-red-500 text-white"
    }
}

function severityStyle(sev: Severity): string {
    switch (sev) {
        case "CRITICAL": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30"
        case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30"
        case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30"
        case "LOW": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30"
        default: return "bg-muted text-muted-foreground border-border"
    }
}

function CategoryCard({ cat }: { cat: CategoryResult }) {
    const failed = cat.findings.filter((f) => !f.passed && f.severity !== "INFO").length
    return (
        <Card className="p-5 border-2">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">{cat.category}</h3>
                {failed === 0 ? (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400">
                        Passed
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400">
                        {failed} issue{failed === 1 ? "" : "s"}
                    </Badge>
                )}
            </div>
            <div className="space-y-2">
                {cat.findings.map((f) => (
                    <div key={f.id} className="flex items-start gap-3 text-sm py-1.5 border-b last:border-0">
                        <div className="mt-0.5 shrink-0">
                            {f.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{f.title}</span>
                                {!f.passed && f.severity !== "INFO" && (
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${severityStyle(f.severity)}`}>
                                        {f.severity}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">{f.detail}</p>
                            {!f.passed && f.recommendation && (
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">💡 {f.recommendation}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

export default function SecurityDetailPage() {
    const params = useParams()
    const endpointId = params.id as string
    const utils = api.useUtils()

    const { data, isLoading } = api.security.getLatestScan.useQuery({ endpointId })

    const scanMut = api.security.scanNow.useMutation({
        onSuccess: (res) => {
            toast.success(`Scan complete — grade ${res.grade} (${res.score}/100)`)
            utils.security.getLatestScan.invalidate({ endpointId })
        },
        onError: (e) => toast.error(e.message || "Scan failed"),
    })

    const triageMut = api.security.runAiTriage.useMutation({
        onSuccess: () => utils.security.getLatestScan.invalidate({ endpointId }),
        onError: (e) => toast.error(e.message || "AI triage failed"),
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <AlertTriangle className="h-12 w-12 text-red-400 mb-3" />
                <p className="text-lg font-semibold text-muted-foreground">Endpoint not found</p>
                <Link href="/dashboard/security">
                    <Button className="mt-4" variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Security
                    </Button>
                </Link>
            </div>
        )
    }

    const { endpoint, scan } = data
    const isScanning = scanMut.isPending
    const isTriaging = triageMut.isPending
    const triage = scan?.aiTriage ?? null

    const categories: CategoryResult[] = scan
        ? [scan.headers, scan.tls, scan.exposedFiles, scan.cookies, scan.httpsRedirect, scan.dnsEmail, scan.techStack]
        : []

    return (
        <div className="w-full space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/security">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{endpoint.name}</h1>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <a href={endpoint.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                            {endpoint.url}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
                <Button onClick={() => scanMut.mutate({ endpointId })} disabled={isScanning}>
                    {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanLine className="h-4 w-4 mr-2" />}
                    {isScanning ? "Scanning…" : scan ? "Re-scan" : "Run Scan"}
                </Button>
            </div>

            {!scan && !isScanning && (
                <Card className="p-12 text-center">
                    <ShieldAlert className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No scan yet</h3>
                    <p className="text-muted-foreground mb-4">Run a security scan to grade this endpoint&apos;s posture.</p>
                    <Button onClick={() => scanMut.mutate({ endpointId })}>
                        <ScanLine className="h-4 w-4 mr-2" /> Run first scan
                    </Button>
                </Card>
            )}

            {isScanning && (
                <Card className="p-12 text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-emerald-500 mb-3" />
                    <p className="text-muted-foreground">Probing headers, TLS, exposed files, DNS…</p>
                </Card>
            )}

            {scan && !isScanning && (
                <>
                    {/* Score + AI triage summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="p-6 border-2 flex items-center gap-5">
                            <div className={`h-20 w-20 rounded-2xl flex items-center justify-center text-4xl font-black ${gradeColor(scan.grade)}`}>
                                {scan.grade}
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{scan.score}<span className="text-lg text-muted-foreground">/100</span></p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Scanned {new Date(scan.scannedAt).toLocaleString()}
                                </p>
                            </div>
                        </Card>

                        {/* AI Triage */}
                        <Card className="lg:col-span-2 p-6 border-2 bg-gradient-to-br from-indigo-50/50 via-card to-purple-50/50 dark:from-indigo-500/10 dark:via-card dark:to-purple-500/10">
                            <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shrink-0">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">AI Vulnerability Triage</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Powered by GPT-4o-mini
                                            {scan.aiTriagedAt && ` · ${new Date(scan.aiTriagedAt).toLocaleString()}`}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={triage ? "outline" : "default"}
                                    className={triage ? "" : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-0"}
                                    onClick={() => triageMut.mutate({ endpointId })}
                                    disabled={isTriaging}
                                >
                                    {isTriaging ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                    {triage ? "Re-triage" : "Triage with AI"}
                                </Button>
                            </div>

                            {isTriaging && (
                                <div className="text-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-1" />
                                    <p className="text-sm text-muted-foreground">Prioritizing risks…</p>
                                </div>
                            )}

                            {!triage && !isTriaging && (
                                <p className="text-sm text-muted-foreground">
                                    Run AI triage to turn the raw findings into a prioritized, plain-English remediation plan.
                                </p>
                            )}

                            {triage && !isTriaging && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={severityStyle(triage.overallRisk)}>
                                            {triage.overallRisk} RISK
                                        </Badge>
                                        <span className="text-sm font-semibold">{triage.summary}</span>
                                    </div>
                                    <ol className="space-y-1 text-sm mt-2">
                                        {triage.prioritizedActions.map((a, i) => (
                                            <li key={i} className="flex gap-2">
                                                <span className="shrink-0 h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                                <span>{a}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Top risks from AI (if present) */}
                    {triage && triage.topRisks.length > 0 && (
                        <Card className="p-6 border-2">
                            <h3 className="font-bold mb-3 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-red-500" /> Top risks
                            </h3>
                            <div className="space-y-3">
                                {triage.topRisks.map((r, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-muted/40 border">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className={severityStyle(r.severity)}>{r.severity}</Badge>
                                            <span className="font-semibold text-sm">{r.title}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground"><strong>Impact:</strong> {r.impact}</p>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1"><strong>Fix:</strong> {r.remediation}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Category breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categories.map((cat) => (
                            <CategoryCard key={cat.category} cat={cat} />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
