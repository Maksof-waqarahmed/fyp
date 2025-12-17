import { AlertTriangle, CheckCircle2, Clock, Monitor } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const RecentActivity = () => {
    return (
        <Card className="">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your monitored websites</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Monitor Added */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">New Monitor Added</p>
                        <p className="text-sm text-muted-foreground">example.com is now being tracked</p>
                    </div>
                    {/* <Badge variant="secondary">2h ago</Badge> */}
                </div>

                {/* Incident Detected */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">Downtime Detected</p>
                        <p className="text-sm text-muted-foreground">api.myapp.com was unreachable for 2m 14s</p>
                    </div>
                    {/* <Badge variant="secondary">1d ago</Badge> */}
                </div>

                {/* Incident Resolved */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">Incident Resolved</p>
                        <p className="text-sm text-muted-foreground">api.myapp.com is back online</p>
                    </div>
                    {/* <Badge variant="secondary">3d ago</Badge> */}
                </div>

                {/* Response Time Improved */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">Response Time Improved</p>
                        <p className="text-sm text-muted-foreground">example.net avg latency down to 230ms</p>
                    </div>
                    {/* <Badge variant="secondary">5d ago</Badge> */}
                </div>
            </CardContent>
        </Card>
    )
}

export default RecentActivity