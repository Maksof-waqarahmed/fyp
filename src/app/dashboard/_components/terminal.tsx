import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Logs } from '@/types/logs.types'
import { Terminal } from 'lucide-react'

interface TerminalProps {
    data: Logs[]
}

const TerminalComp = ({ data }: TerminalProps) => {

    const getStatusColor = (status: string) => {
        switch (status) {
            case "UP":
                return "text-green-400"
            case "DOWN":
                return "text-red-400"
            default:
                return "text-gray-400"
        }
    }

    const getHttpColor = (code: number | null) => {
        if (!code) return "text-gray-400"
        if (code >= 200 && code < 300) return "text-green-400"
        if (code >= 400 && code < 500) return "text-yellow-400"
        if (code >= 500) return "text-red-400"
        return "text-gray-400"
    }

    return (
        <Card className="bg-black border-gray-700">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-400">
                    <Terminal className="h-5 w-5" />
                    Live Logs
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="bg-black rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                    {data?.map((log) => (
                        <div key={log.id} className="mb-3 hover:bg-gray-900 p-2 rounded">

                            <span className="text-gray-500">
                                [{new Date(log.checkedAt).toLocaleString()}]
                            </span>{" "}

                            <span className={getHttpColor(log.httpCode)}>
                                {log.httpCode ?? "N/A"}
                            </span>{" "}

                            <span className="text-blue-400">
                                <a href={log.endpoint?.url} target="_blank">
                                    {log.endpoint?.url}
                                </a>
                            </span>{" "}

                            <span className="text-purple-400">
                                ({log.endpoint?.name})
                            </span>


                            <span className={getStatusColor(log.status)}>
                                {log.status}
                            </span>{" "}

                            <span className="text-gray-400">
                                {log.responseTime}ms
                            </span>

                            {!log.sslValid && (
                                <span className="text-yellow-400 ml-2">
                                    SSL Invalid
                                </span>
                            )}

                            {log.dnsStatus !== "RESOLVED" && (
                                <span className="text-red-400 ml-2">
                                    DNS Issue
                                </span>
                            )}

                            <br />

                            <span className="text-gray-300 ml-4">
                                └─ {log.errorMessage ?? "Successful"}
                            </span>
                        </div>
                    ))}

                    {data?.length === 0 && (
                        <div className="text-gray-500 text-center py-8">
                            No logs found
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default TerminalComp