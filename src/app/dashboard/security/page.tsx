"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { api } from "@/trpc/trpc-server/react"
import { Loader2, ShieldCheck, ChevronRight, Globe } from "lucide-react"
import Link from "next/link"

function gradeColor(grade: string | null): string {
    switch (grade) {
        case "A": return "bg-green-500 text-white"
        case "B": return "bg-lime-500 text-white"
        case "C": return "bg-yellow-500 text-white"
        case "D": return "bg-orange-500 text-white"
        case "F": return "bg-red-500 text-white"
        default: return "bg-muted text-muted-foreground"
    }
}

export default function SecurityOverviewPage() {
    const { data, isLoading } = api.security.getAllLatestScans.useQuery()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const endpoints = data ?? []

    return (
        <div className="w-full space-y-6 pb-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Security Posture</h1>
                    <p className="text-sm text-muted-foreground">
                        Header, TLS, exposed-file, cookie, DNS/email &amp; tech-stack scanning with AI triage
                    </p>
                </div>
            </div>

            {endpoints.length === 0 ? (
                <Card className="p-12 text-center">
                    <ShieldCheck className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No endpoints yet</h3>
                    <p className="text-muted-foreground">Add an endpoint under Monitoring, then run a security scan here.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {endpoints.map((ep) => (
                        <Link key={ep.id} href={`/dashboard/security/${ep.id}`}>
                            <Card className="p-5 border-2 hover:border-emerald-400/50 transition-colors cursor-pointer h-full">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-bold truncate">{ep.name}</h3>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                                            <Globe className="h-3 w-3 shrink-0" />
                                            {ep.url}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">{ep.projectName}</p>
                                    </div>
                                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center text-lg font-black shrink-0 ${gradeColor(ep.latestGrade)}`}>
                                        {ep.latestGrade ?? "–"}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                    <span className="text-xs text-muted-foreground">
                                        {ep.scannedAt
                                            ? `Score ${ep.latestScore}/100 · ${new Date(ep.scannedAt).toLocaleDateString()}`
                                            : "Not scanned yet"}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
