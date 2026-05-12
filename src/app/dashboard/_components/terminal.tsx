import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Logs } from '@/types/logs.types'
import { Terminal } from 'lucide-react'

interface TerminalProps {
    data: Logs[]
    isLive?: boolean
    newLogIds?: Set<string>
}

const TerminalComp = ({ data, isLive, newLogIds }: TerminalProps) => {

    const getStatusColor = (status: string) => {
        switch (status) {
            case "UP": return "text-emerald-400"
            case "DOWN": return "text-red-400"
            case "REDIRECT": return "text-yellow-400"
            default: return "text-gray-400"
        }
    }

    const getHttpColor = (code: number | null) => {
        if (!code) return "text-gray-500"
        if (code >= 200 && code < 300) return "text-emerald-400"
        if (code >= 300 && code < 400) return "text-yellow-400"
        if (code >= 400 && code < 500) return "text-orange-400"
        if (code >= 500) return "text-red-400"
        return "text-gray-400"
    }

    return (
        <Card className="bg-zinc-950 border-zinc-800 rounded-2xl flex flex-col h-full">
            <CardHeader className="pb-3 pt-4 px-4 shrink-0">
                <CardTitle className="flex items-center gap-2 text-emerald-400 text-sm font-mono">
                    <div className="flex gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-red-500/70" />
                        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                        <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
                    </div>
                    <Terminal className="h-4 w-4 ml-1" />
                    <span>live logs</span>
                    {isLive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                            LIVE
                        </span>
                    )}
                    {data.length > 0 && (
                        <span className="ml-auto text-[10px] text-zinc-500 font-normal">
                            {data.length} entries
                        </span>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent className="px-4 pb-4 flex-1 min-h-0">
                <div className="h-full max-h-[1000px] overflow-y-auto font-mono text-xs space-y-1 pr-1
                    scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">

                    {data.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-600">
                            <span>~ no logs yet</span>
                        </div>
                    ) : data.map((log) => (
                        <div
                            key={log.id}
                            className={`group py-1.5 px-2 rounded-lg transition-colors border ${
                                newLogIds?.has(log.id)
                                    ? 'bg-emerald-950/40 border-emerald-800/50'
                                    : 'border-transparent hover:bg-zinc-900 hover:border-zinc-800'
                            }`}
                        >
                            {/* Line 1: timestamp + status + code + response time */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-zinc-600 text-[10px] shrink-0">
                                    {new Date(log.checkedAt).toLocaleTimeString()}
                                </span>
                                <span className={`font-semibold w-36 shrink-0 ${getStatusColor(log.status)}`}>
                                    {log.status}
                                </span>
                                <span className={`shrink-0 ${getHttpColor(log.httpCode)}`}>
                                    {log.httpCode ?? '---'}
                                </span>
                                {log.responseTime != null && (
                                    <span className="text-zinc-400 shrink-0">
                                        {log.responseTime}ms
                                    </span>
                                )}
                                {!log.sslValid && (
                                    <span className="text-yellow-500 text-[10px]">⚠ SSL</span>
                                )}
                                {log.dnsStatus !== "RESOLVED" && (
                                    <span className="text-red-400 text-[10px]">⚠ DNS</span>
                                )}
                            </div>

                            {/* Line 2: URL + name */}
                            <div className="flex items-center gap-1.5 mt-0.5 pl-0.5">
                                <span className="text-zinc-600">└</span>
                                <a
                                    href={log.endpoint?.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:text-blue-300 truncate transition-colors"
                                >
                                    {log.endpoint?.url}
                                </a>
                                {log.endpoint?.name && (
                                    <span className="text-zinc-500 shrink-0">
                                        ({log.endpoint.name})
                                    </span>
                                )}
                            </div>

                            {/* Line 3: error message if any */}
                            {log.errorMessage && (
                                <div className="flex items-center gap-1.5 mt-0.5 pl-0.5">
                                    <span className="text-zinc-700">└</span>
                                    <span className="text-red-400/80 truncate">{log.errorMessage}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export default TerminalComp
