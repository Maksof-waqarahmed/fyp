"use client"
import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"

type TrendDay = {
    date: string
    up: number
    down: number
    other: number
    total: number
    uptimePercentage: string
}

interface UptimeHeatmapProps {
    trends: TrendDay[]
    days?: number
}

type Cell = {
    date: string
    data: TrendDay | null
    isPadding: boolean
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const LEGEND = [
    { color: "#3f3f46", label: "No data" },
    { color: "#ef4444", label: "< 75%" },
    { color: "#f97316", label: "75–90%" },
    { color: "#eab308", label: "90–95%" },
    { color: "#4ade80", label: "95–99%" },
    { color: "#16a34a", label: "≥ 99%" },
]

function getCellColor(cell: Cell): string {
    if (cell.isPadding) return "transparent"
    if (!cell.data || cell.data.total === 0) return "#3f3f46"
    const pct = parseFloat(cell.data.uptimePercentage)
    if (pct >= 99) return "#16a34a"
    if (pct >= 95) return "#4ade80"
    if (pct >= 90) return "#eab308"
    if (pct >= 75) return "#f97316"
    return "#ef4444"
}

function buildGrid(trends: TrendDay[], totalDays: number): Cell[][] {
    const trendMap = new Map(trends.map((t) => [t.date, t]))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startDate = new Date(today)
    startDate.setDate(today.getDate() - (totalDays - 1))

    // Pad grid back to the previous Monday so columns align
    const startDow = startDate.getDay() // 0 = Sun
    const daysToMonday = startDow === 0 ? 6 : startDow - 1
    const gridStart = new Date(startDate)
    gridStart.setDate(startDate.getDate() - daysToMonday)

    const cells: Cell[] = []
    const cursor = new Date(gridStart)
    while (cursor <= today) {
        const dateStr = cursor.toISOString().split("T")[0]!
        const inRange = cursor >= startDate
        cells.push({
            date: dateStr,
            data: inRange ? (trendMap.get(dateStr) ?? null) : null,
            isPadding: !inRange,
        })
        cursor.setDate(cursor.getDate() + 1)
    }

    const weeks: Cell[][] = []
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7))
    }
    return weeks
}

function getMonthLabels(weeks: Cell[][]): Array<{ weekIndex: number; label: string }> {
    const labels: Array<{ weekIndex: number; label: string }> = []
    let lastMonth = -1
    weeks.forEach((week, i) => {
        const first = week.find((c) => !c.isPadding)
        if (!first) return
        const month = new Date(first.date + "T00:00:00").getMonth()
        if (month !== lastMonth) {
            labels.push({
                weekIndex: i,
                label: new Date(first.date + "T00:00:00").toLocaleString("default", { month: "short" }),
            })
            lastMonth = month
        }
    })
    return labels
}

interface TooltipState {
    cell: Cell
    x: number
    y: number
}

export function UptimeHeatmap({ trends, days = 90 }: UptimeHeatmapProps) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)

    const weeks = useMemo(() => buildGrid(trends, days), [trends, days])
    const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks])

    const avgUptime =
        trends.length > 0
            ? (trends.reduce((s, t) => s + parseFloat(t.uptimePercentage), 0) / trends.length).toFixed(1)
            : null

    const perfectDays = trends.filter((t) => parseFloat(t.uptimePercentage) >= 99).length
    const issueDays = trends.filter((t) => t.total > 0 && parseFloat(t.uptimePercentage) < 90).length

    const CELL = 13
    const GAP = 3
    const STEP = CELL + GAP

    return (
        <Card>
            <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Uptime Heatmap</h3>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            Last {days} days
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {avgUptime && (
                            <>
                                <span>
                                    Avg{" "}
                                    <span className="font-semibold text-foreground tabular-nums">
                                        {avgUptime}%
                                    </span>
                                </span>
                                <span className="h-3 w-px bg-border" />
                            </>
                        )}
                        <span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {perfectDays}
                            </span>{" "}
                            perfect days
                        </span>
                        {issueDays > 0 && (
                            <>
                                <span className="h-3 w-px bg-border" />
                                <span>
                                    <span className="font-semibold text-red-500 tabular-nums">
                                        {issueDays}
                                    </span>{" "}
                                    with issues
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-5">
                <div className="overflow-x-auto pb-1">
                    <div style={{ minWidth: weeks.length * STEP + 32 }}>

                        {/* Month labels row */}
                        <div className="relative mb-1.5" style={{ height: 14, marginLeft: 28 }}>
                            {monthLabels.map(({ weekIndex, label }) => (
                                <span
                                    key={label + weekIndex}
                                    className="absolute text-[10px] text-muted-foreground select-none"
                                    style={{ left: weekIndex * STEP }}
                                >
                                    {label}
                                </span>
                            ))}
                        </div>

                        {/* Grid row = day labels + week columns */}
                        <div className="flex" style={{ gap: GAP }}>

                            {/* Day-of-week labels */}
                            <div className="flex flex-col shrink-0" style={{ gap: GAP, width: 24 }}>
                                {DAY_LABELS.map((d, i) => (
                                    <div
                                        key={d}
                                        className="text-[9px] text-muted-foreground flex items-center justify-end pr-1 select-none"
                                        style={{ height: CELL, opacity: i % 2 === 0 ? 1 : 0 }}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Week columns */}
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                                    {week.map((cell, di) => (
                                        <div
                                            key={di}
                                            className="rounded-sm transition-opacity hover:opacity-75"
                                            style={{
                                                width: CELL,
                                                height: CELL,
                                                backgroundColor: getCellColor(cell),
                                                cursor: cell.isPadding ? "default" : "crosshair",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!cell.isPadding) {
                                                    setTooltip({ cell, x: e.clientX, y: e.clientY })
                                                }
                                            }}
                                            onMouseMove={(e) => {
                                                if (tooltip) {
                                                    setTooltip((prev) =>
                                                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null
                                                    )
                                                }
                                            }}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-between mt-3" style={{ marginLeft: 28 }}>
                            <span className="text-[10px] text-muted-foreground">Worse</span>
                            <div className="flex items-center gap-1">
                                {LEGEND.map(({ color, label }) => (
                                    <div
                                        key={color}
                                        title={label}
                                        className="rounded-sm"
                                        style={{ width: CELL, height: CELL, backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Better</span>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Floating tooltip — portal-less, fixed position */}
            {tooltip && (
                <div
                    className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-xs bg-popover border border-border shadow-lg text-popover-foreground"
                    style={{ left: tooltip.x + 14, top: tooltip.y - 60 }}
                >
                    <p className="font-semibold mb-0.5">
                        {new Date(tooltip.cell.date + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                        })}
                    </p>
                    {tooltip.cell.data && tooltip.cell.data.total > 0 ? (
                        <>
                            <p>
                                Uptime:{" "}
                                <span className="font-semibold">
                                    {tooltip.cell.data.uptimePercentage}%
                                </span>
                            </p>
                            <p className="text-muted-foreground">
                                {tooltip.cell.data.up} up · {tooltip.cell.data.down} down ·{" "}
                                {tooltip.cell.data.total} checks
                            </p>
                        </>
                    ) : (
                        <p className="text-muted-foreground">No monitoring data</p>
                    )}
                </div>
            )}
        </Card>
    )
}
