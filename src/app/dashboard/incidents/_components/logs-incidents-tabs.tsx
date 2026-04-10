"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GetAllIncidentsResponse } from "@/types/incidents.types"
import { Log } from "@/types/logs.types"
import IncidentTable from "./incident-table"
import LogsTable from "./logs-table"

interface LogsIncidentsTabsProps {
    initialIncidentsData: GetAllIncidentsResponse
    initialLogsData: Log[]
}

export default function LogsIncidentsTabs({ initialIncidentsData, initialLogsData }: LogsIncidentsTabsProps) {
    return (
        <Tabs defaultValue="incidents" className="w-full space-y-4">
            {/* Header with Tabs */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Monitoring Logs & Incidents</h1>
                    <p className="text-muted-foreground mt-1">Track all monitoring logs and grouped incidents</p>
                </div>

                {/* Tabs on Right */}
                <TabsList className="grid grid-cols-2 w-[280px] h-9">
                    <TabsTrigger value="incidents" className="text-sm">
                        Incidents
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-sm">
                        All Logs
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* Tab Content */}
            <TabsContent value="incidents" className="mt-0">
                <IncidentTable initialData={initialIncidentsData} />
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
                <LogsTable initialData={initialLogsData} />
            </TabsContent>
        </Tabs>
    )
}
