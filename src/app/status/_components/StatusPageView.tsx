import type { StatusPageData } from "../_lib/load";

function uptimeColor(pct: number | null) {
    if (pct === null) return "#94a3b8";
    if (pct >= 99) return "#22c55e";
    if (pct >= 95) return "#f59e0b";
    return "#ef4444";
}

function statusLabel(s: string | null) {
    if (s === "UP")
        return { label: "Operational", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" };
    if (s === "DOWN")
        return { label: "Down", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", text: "#dc2626" };
    if (s === "REDIRECT")
        return { label: "Redirect", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", text: "#d97706" };
    return { label: "Unknown", color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" };
}

export function StatusPageView({ data }: { data: StatusPageData }) {
    const now = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

    return (
        <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: "#f8fafc", minHeight: "100vh", color: "#1e293b" }}>
            {/* Top bar */}
            <div style={{ background: "#0f172a", color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "8px 16px" }}>
                Powered by <span style={{ color: "#38bdf8", fontWeight: 600 }}>Uptime Monitor</span>
                &nbsp;·&nbsp; Public Status Page
            </div>

            {/* Hero */}
            <div style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 36px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                        <div>
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                background: data.allUp ? "#f0fdf4" : "#fef2f2",
                                border: `1px solid ${data.allUp ? "#bbf7d0" : "#fecaca"}`,
                                borderRadius: 999, padding: "6px 16px", marginBottom: 18,
                            }}>
                                <span style={{
                                    width: 10, height: 10, borderRadius: "50%",
                                    background: data.allUp ? "#22c55e" : "#ef4444",
                                    display: "inline-block", flexShrink: 0,
                                }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: data.allUp ? "#16a34a" : "#dc2626" }}>
                                    {data.allUp ? "All Systems Operational" : `${data.downCount} System${data.downCount > 1 ? "s" : ""} Down`}
                                </span>
                            </div>

                            <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{data.title}</h1>
                            {data.description && (
                                <p style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>{data.description}</p>
                            )}
                            <p style={{ fontSize: 12, color: "#94a3b8" }}>Last updated: {now}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 64px" }}>
                {/* Stat chips */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
                    {[
                        { label: "Total Services", value: data.totalEndpoints, color: "#334155" },
                        { label: "Operational", value: data.upCount, color: "#16a34a" },
                        { label: "Degraded / Down", value: data.downCount, color: data.downCount > 0 ? "#dc2626" : "#334155" },
                        { label: "Uptime (90d)", value: data.avgUptime !== null ? `${data.avgUptime.toFixed(2)}%` : "—", color: uptimeColor(data.avgUptime) },
                        { label: "Avg Response", value: data.avgResponse !== null ? `${data.avgResponse}ms` : "—", color: "#334155" },
                    ].map((chip) => (
                        <div key={chip.label} style={{
                            background: "white", border: "1px solid #e2e8f0", borderRadius: 12,
                            padding: "14px 20px", flex: 1, minWidth: 110,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: chip.color }}>{chip.value}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                {chip.label}
                            </div>
                        </div>
                    ))}
                </div>

                {data.projects.map((proj) => (
                    <div key={proj.id} style={{ marginBottom: 20 }}>
                        {data.projects.length > 1 && (
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
                                {proj.projectName}
                            </p>
                        )}

                        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, marginBottom: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#94a3b8" }}>Current Status</span>
                                <span style={{ fontSize: 11, color: "#94a3b8" }}>Checked every {proj.endpoints[0]?.checkInterval ?? 5}m</span>
                            </div>

                            {proj.endpoints.length === 0 ? (
                                <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                                    No endpoints in this project
                                </div>
                            ) : proj.endpoints.map((ep, idx) => {
                                const st = statusLabel(ep.lastStatus);
                                return (
                                    <div key={ep.id} style={{
                                        display: "flex", alignItems: "center", padding: "14px 20px", gap: 12,
                                        borderBottom: idx < proj.endpoints.length - 1 ? "1px solid #f8fafc" : "none",
                                    }}>
                                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: st.color, display: "inline-block", flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 500 }}>{ep.name}</div>
                                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {ep.url}
                                            </div>
                                        </div>
                                        {ep.avgResponse !== null && (
                                            <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>{ep.avgResponse}ms</span>
                                        )}
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                                            background: st.bg, color: st.text, border: `1px solid ${st.border}`,
                                            flexShrink: 0,
                                        }}>{st.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#94a3b8" }}>
                                    Uptime History — Last 90 Days
                                </span>
                                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#94a3b8" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 2, background: "#22c55e", display: "inline-block" }} /> Up
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444", display: "inline-block" }} /> Down
                                    </span>
                                </div>
                            </div>

                            {proj.endpoints.map((ep, idx) => {
                                const color = uptimeColor(ep.uptime90d);
                                return (
                                    <div key={ep.id} style={{
                                        padding: "14px 20px",
                                        borderBottom: idx < proj.endpoints.length - 1 ? "1px solid #f8fafc" : "none",
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                            <span style={{ fontSize: 13, fontWeight: 500 }}>{ep.name}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color }}>
                                                {ep.uptime90d !== null ? `${ep.uptime90d.toFixed(2)}%` : "No data"}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", gap: 2, height: 28 }}>
                                            {ep.bars.map((bar, i) => (
                                                <div
                                                    key={i}
                                                    title={bar === "up" ? "Up" : bar === "down" ? "Down" : "No data"}
                                                    style={{
                                                        flex: 1, borderRadius: 2, height: "100%",
                                                        background: bar === "up" ? "#22c55e" : bar === "down" ? "#ef4444" : "#e2e8f0",
                                                        opacity: bar === "empty" ? 0.5 : 0.85,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "#94a3b8" }}>
                                            <span>90 days ago</span><span>Today</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
                    Powered by <span style={{ color: "#3b82f6", fontWeight: 600 }}>Uptime Monitor</span>
                    &nbsp;·&nbsp; Status pages for developers
                </div>
            </div>
        </div>
    );
}
