import React from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const Cards = () => {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* Total Monitors */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Monitors</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="text-green-500 font-medium">+2</span> added this month
                    </p>
                </CardContent>
            </Card>

            {/* Uptime Percentage */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">99.95%</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="text-green-500 font-medium">+0.02%</span> this week
                    </p>
                </CardContent>
            </Card>

            {/* Downtime Incidents */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Downtime</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="text-red-500 font-medium">2m 14s</span> total downtime
                    </p>
                </CardContent>
            </Card>

            {/* Avg Response Time */}
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">245ms</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="text-blue-500 font-medium">-15ms</span> from last week
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

export default Cards
