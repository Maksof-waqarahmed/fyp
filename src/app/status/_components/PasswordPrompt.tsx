"use client";

import { useActionState, useEffect } from "react";
import { verifyAccess, type VerifyAccessState } from "../_lib/actions";

export function PasswordPrompt({ pageId, title }: { pageId: string; title: string }) {
    const [state, formAction, pending] = useActionState<VerifyAccessState, FormData>(
        verifyAccess,
        null
    );

    useEffect(() => {
        if (state?.ok) {
            // Cookie now set on this domain (works through reverse proxy too).
            // Reload so the page route re-runs and renders the actual content.
            window.location.reload();
        }
    }, [state]);

    return (
        <div style={{
            minHeight: "100vh", background: "#f8fafc", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
            color: "#1e293b",
        }}>
            <div style={{
                background: "white", border: "1px solid #e2e8f0", borderRadius: 16,
                padding: "40px 32px", maxWidth: 420, width: "100%",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}>
                <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 18px", color: "white", fontSize: 20,
                }}>🔒</div>

                <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 6 }}>
                    {title}
                </h1>
                <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 24 }}>
                    This status page is password-protected. Enter the password to view it.
                </p>

                <form action={formAction}>
                    <input type="hidden" name="id" value={pageId} />
                    <input
                        type="password"
                        name="password"
                        autoFocus
                        required
                        placeholder="Password"
                        style={{
                            width: "100%", padding: "10px 14px", fontSize: 14,
                            border: "1px solid #e2e8f0", borderRadius: 10,
                            outline: "none", marginBottom: 12,
                            boxSizing: "border-box",
                        }}
                        disabled={pending}
                    />

                    {state?.error && (
                        <div style={{
                            background: "#fef2f2", color: "#dc2626", padding: "8px 12px",
                            borderRadius: 8, fontSize: 13, marginBottom: 12,
                            border: "1px solid #fecaca",
                        }}>{state.error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={pending}
                        style={{
                            width: "100%", padding: "10px 14px", fontSize: 14, fontWeight: 600,
                            background: pending ? "#94a3b8" : "linear-gradient(135deg, #6366f1, #a855f7)",
                            color: "white", border: "none", borderRadius: 10, cursor: pending ? "wait" : "pointer",
                        }}
                    >
                        {pending ? "Verifying…" : "Access Status Page"}
                    </button>
                </form>

                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 18 }}>
                    Powered by <span style={{ color: "#3b82f6", fontWeight: 600 }}>Uptime Monitor</span>
                </p>
            </div>
        </div>
    );
}
