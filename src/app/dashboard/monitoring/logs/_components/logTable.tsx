import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Logs } from "@/types/logs.types";
import { Filter } from "lucide-react";

interface TableProps {
    data: Logs[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "UP":
            return "text-green-600 font-semibold";
        case "DOWN":
            return "text-red-600 font-semibold";
        default:
            return "text-gray-600";
    }
};

const getHttpColor = (code: number | null) => {
    if (!code) return "text-gray-500";
    if (code >= 200 && code < 300) return "text-green-600";
    if (code >= 400 && code < 500) return "text-yellow-600";
    if (code >= 500) return "text-red-600";
    return "text-gray-600";
};

const TableLogs = ({ data }: TableProps) => {
    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

                        {/* Project Name */}
                        <div className="space-y-2">
                            <Label>Project Name</Label>
                            <Input
                                placeholder="Search project..."
                            />
                        </div>

                        {/* Endpoint Name */}
                        <div className="space-y-2">
                            <Label>Endpoint Name</Label>
                            <Input
                                placeholder="Search endpoint..."
                            />
                        </div>

                        {/* DNS Status */}
                        <div className="space-y-2">
                            <Label>DNS Status</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select DNS status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                                    <SelectItem value="FAILED">FAILED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* HTTP Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UP">UP</SelectItem>
                                    <SelectItem value="REDIRECT">REDIRECT</SelectItem>
                                    <SelectItem value="CLIENT_ERROR">CLIENT ERROR</SelectItem>
                                    <SelectItem value="DOWN">DOWN</SelectItem>
                                    <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" />
                        </div>

                        {/* End Date */}
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline">
                            Reset
                        </Button>
                        <Button>
                            Apply Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card mt-4">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Log Details
                    </CardTitle>
                    <div>
                        <Button>Donwload CSV</Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead>HTTP</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>DNS</TableHead>
                                <TableHead>SSL</TableHead>
                                <TableHead>Error</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {data.length > 0 ? (
                                data.map((log) => (
                                    <TableRow key={log.id}>
                                        {/* Timestamp */}
                                        <TableCell className="font-mono text-sm">
                                            {new Date(log.checkedAt).toLocaleString()}
                                        </TableCell>

                                        {/* Endpoint Name */}
                                        <TableCell className="font-medium">
                                            {log.endpoint?.name ?? "N/A"}
                                        </TableCell>

                                        {/* URL */}
                                        <TableCell className="font-mono text-sm text-blue-600 max-w-[200px] truncate">
                                            <a
                                                href={log.endpoint?.url}
                                                target="_blank"
                                                title={log.endpoint?.url}
                                            >
                                                {log.endpoint?.url}
                                            </a>
                                        </TableCell>

                                        {/* HTTP Code */}
                                        <TableCell
                                            className={`font-mono text-sm ${getHttpColor(
                                                log.httpCode
                                            )}`}
                                        >
                                            {log.httpCode ?? "—"}
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <span className={getStatusColor(log.status)}>
                                                {log.status}
                                            </span>
                                        </TableCell>

                                        {/* Response Time */}
                                        <TableCell className="font-mono text-sm">
                                            {log.responseTime ? `${log.responseTime} ms` : "—"}
                                        </TableCell>

                                        {/* DNS */}
                                        <TableCell
                                            className={
                                                log.dnsStatus === "RESOLVED"
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            }
                                        >
                                            {log.dnsStatus}
                                        </TableCell>

                                        {/* SSL */}
                                        <TableCell
                                            className={
                                                log.sslValid
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                            }
                                        >
                                            {log.sslValid ? "Valid" : "Invalid"}
                                        </TableCell>

                                        {/* Error */}
                                        <TableCell className="text-sm text-gray-600 max-w-[150px] truncate">
                                            {log.errorMessage ?? "—"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-6">
                                        No logs found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default TableLogs;
