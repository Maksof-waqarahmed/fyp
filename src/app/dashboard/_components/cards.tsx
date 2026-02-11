"use client"
import React, { use } from 'react'
import { Activity, CheckCircle2, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Bar, BarChart, Cell } from "recharts";

const data = [
    { value: 400 }, { value: 300 }, { value: 500 },
    { value: 280 }, { value: 590 }, { value: 320 }, { value: 480 }
];

const downtimeData = [
    { value: 10 }, { value: 25 }, { value: 15 },
    { value: 30 }, { value: 12 }, { value: 20 }, { value: 40 }
];
const Cards = () => {
    return (
        // <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        //     {/* Total Monitors */}
        //     <Card className="hover:shadow-md transition-shadow">
        //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        //             <CardTitle className="text-sm font-medium">Total Monitors</CardTitle>
        //             <Activity className="h-4 w-4 text-muted-foreground" />
        //         </CardHeader>
        //         <CardContent>
        //             <div className="text-2xl font-bold">12</div>
        //             <p className="text-xs text-muted-foreground">
        //                 <span className="text-green-500 font-medium">+2</span> added this month
        //             </p>
        //         </CardContent>
        //     </Card>

        //     {/* Uptime Percentage */}
        //     <Card className="hover:shadow-md transition-shadow">
        //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        //             <CardTitle className="text-sm font-medium">Uptime</CardTitle>
        //             <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        //         </CardHeader>
        //         <CardContent>
        //             <div className="text-2xl font-bold">99.95%</div>
        //             <p className="text-xs text-muted-foreground">
        //                 <span className="text-green-500 font-medium">+0.02%</span> this week
        //             </p>
        //         </CardContent>
        //     </Card>

        //     {/* Downtime Incidents */}
        //     <Card className="hover:shadow-md transition-shadow">
        //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        //             <CardTitle className="text-sm font-medium">Downtime</CardTitle>
        //             <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        //         </CardHeader>
        //         <CardContent>
        //             <div className="text-2xl font-bold">3</div>
        //             <p className="text-xs text-muted-foreground">
        //                 <span className="text-red-500 font-medium">2m 14s</span> total downtime
        //             </p>
        //         </CardContent>
        //     </Card>

        //     {/* Avg Response Time */}
        //     <Card className="hover:shadow-md transition-shadow">
        //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        //             <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
        //             <Clock className="h-4 w-4 text-muted-foreground" />
        //         </CardHeader>
        //         <CardContent>
        //             <div className="text-2xl font-bold">245ms</div>
        //             <p className="text-xs text-muted-foreground">
        //                 <span className="text-blue-500 font-medium">-15ms</span> from last week
        //             </p>
        //         </CardContent>
        //     </Card>
        // </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">

            {/* 1. Total Monitors (Area Chart) */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Monitors</CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-emerald-600" />
                    </div>
                </CardHeader>
                <CardContent className="pb-0">
                    <div className="text-3xl font-bold tracking-tight">12</div>
                    <p className="text-[11px] text-emerald-500 font-medium mb-4">+2 this month</p>
                    <div className="h-[60px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorGreen)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Uptime (Clean Minimal Look) */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Uptime</CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight">99.95%</div>
                    <p className="text-[11px] text-emerald-500 font-medium mb-4">+0.02% this week</p>
                    <div className="h-[60px] flex items-center">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.95%' }} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Downtime (Bar Chart) */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Downtime</CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                </CardHeader>
                <CardContent className="pb-0">
                    <div className="text-3xl font-bold tracking-tight">3</div>
                    <p className="text-[11px] text-red-500 font-medium mb-4">2m 14s total</p>
                    <div className="h-[60px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={downtimeData}>
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {downtimeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 6 ? '#ef4444' : '#fee2e2'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Avg Response Time (Smooth Area Chart) */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Avg Response</CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-indigo-600" />
                    </div>
                </CardHeader>
                <CardContent className="pb-0">
                    <div className="text-3xl font-bold tracking-tight text-slate-900">245ms</div>
                    <p className="text-[11px] text-indigo-500 font-medium mb-4">-15ms from last week</p>
                    <div className="h-[60px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <Area type="stepAfter" dataKey="value" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}

export default Cards
