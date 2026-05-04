"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/trpc/trpc-server/react"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Globe, Loader2, Shield, Code, Copy, RefreshCcw, KeyRound, AlertTriangle,
} from "lucide-react"

interface Props {
    pageId: string
    onClose: () => void
}

export function StatusPageSettingsDialog({ pageId, onClose }: Props) {
    const router = useRouter()
    const utils = api.useUtils()

    const { data: page, isLoading } = api.statusPage.getOne.useQuery({ id: pageId })

    if (isLoading || !page) {
        return (
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Loading status page settings</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure: {page.title}</DialogTitle>
                    <DialogDescription>
                        Mount this status page anywhere on your website, and control who can see it.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="mount" className="mt-2">
                    <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="mount"><Code className="h-3.5 w-3.5 mr-1.5" /> Mount on your site</TabsTrigger>
                        <TabsTrigger value="visibility"><Shield className="h-3.5 w-3.5 mr-1.5" /> Visibility</TabsTrigger>
                    </TabsList>

                    <TabsContent value="mount" className="mt-4">
                        <MountSection
                            pageId={pageId}
                            embedKey={page.embedKey}
                            slug={page.slug}
                            onChanged={() => {
                                utils.statusPage.getOne.invalidate({ id: pageId })
                                router.refresh()
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="visibility" className="mt-4">
                        <VisibilitySection
                            pageId={pageId}
                            visibility={page.visibility}
                            hasAccessKey={page.hasAccessKey}
                            onChanged={() => {
                                utils.statusPage.getOne.invalidate({ id: pageId })
                                router.refresh()
                            }}
                        />
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Mount section ───────────────────────────────────────────────────────────

function MountSection({
    pageId, embedKey, slug, onChanged,
}: {
    pageId: string
    embedKey: string
    slug: string
    onChanged: () => void
}) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-app.com"
    const embedUrl = `${origin}/embed/${embedKey}`
    const fallbackUrl = `${origin}/status/${slug}`

    const [platform, setPlatform] = useState<
        "nginx" | "vercel" | "cloudflare-worker" | "caddy" | "apache" | "iframe"
    >("nginx")

    const regenMut = api.statusPage.regenerateEmbedKey.useMutation({
        onSuccess: (res) => {
            toast.success(res.message)
            onChanged()
        },
        onError: (e) => toast.error(e.message),
    })

    const snippets: Record<typeof platform, { label: string; code: string; note: string }> = {
        "nginx": {
            label: "Nginx",
            code: `# In your nginx server { } block — pick any path you like
location /status/ {
    proxy_pass         ${embedUrl}/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}`,
            note: "Mount path is /status/ here — change it to whatever you want (/uptime, /health, /abc/status …). Keep the trailing slashes; they matter for path forwarding.",
        },
        "vercel": {
            label: "Vercel rewrites",
            code: `// next.config.ts on YOUR site
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/status/:path*',
                destination: '${embedUrl}/:path*',
            },
        ];
    },
};
export default nextConfig;`,
            note: "Works for any Next.js site on Vercel. Change /status to whatever path fits your site.",
        },
        "cloudflare-worker": {
            label: "Cloudflare Worker",
            code: `// Bind this Worker to /status/* on your zone
export default {
    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/status' || url.pathname.startsWith('/status/')) {
            const tail = url.pathname.replace(/^\\/status/, '') || '/';
            const target = '${embedUrl}' + tail + url.search;
            return fetch(target, request);
        }
        return fetch(request);
    },
};`,
            note: "Free on Cloudflare. Add a Worker route like example.com/status* in the dashboard.",
        },
        "caddy": {
            label: "Caddy",
            code: `# In your Caddyfile
example.com {
    handle_path /status* {
        reverse_proxy ${embedUrl} {
            header_up Host {host}
        }
    }
}`,
            note: "Caddy auto-issues TLS. handle_path strips the prefix before proxying.",
        },
        "apache": {
            label: "Apache",
            code: `# In your Apache vhost (mod_proxy + mod_proxy_http enabled)
ProxyPreserveHost On
ProxyPass        /status ${embedUrl}
ProxyPassReverse /status ${embedUrl}`,
            note: "Make sure mod_proxy and mod_proxy_http are loaded.",
        },
        "iframe": {
            label: "iframe (no server config)",
            code: `<iframe
    src="${embedUrl}"
    width="100%"
    height="900"
    style="border:none;"
    title="Status Page"
></iframe>`,
            note: "Works without any server-side config. Drop into any HTML page on your site.",
        },
    }

    const current = snippets[platform]

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast.success("Copied to clipboard")
    }

    return (
        <div className="space-y-4">
            <div>
                <Label className="text-sm">Your embed URL</Label>
                <div className="mt-1.5 bg-muted/40 rounded-lg p-3 flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs flex-1 truncate">{embedUrl}</span>
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => copyCode(embedUrl)}>
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                    Keep this URL <span className="font-semibold">private</span> — anyone with it can render the page (subject to visibility rules below).
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => {
                        if (confirm("Regenerating will break any existing reverse-proxy or iframe config. Continue?")) {
                            regenMut.mutate({ id: pageId })
                        }
                    }}
                    disabled={regenMut.isPending}
                >
                    {regenMut.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCcw className="h-3 w-3 mr-1" />}
                    Regenerate embed URL
                </Button>
            </div>

            <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Mount instructions</Label>
                    <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nginx">Nginx</SelectItem>
                            <SelectItem value="vercel">Vercel rewrites</SelectItem>
                            <SelectItem value="cloudflare-worker">Cloudflare Worker</SelectItem>
                            <SelectItem value="caddy">Caddy</SelectItem>
                            <SelectItem value="apache">Apache</SelectItem>
                            <SelectItem value="iframe">iframe (no server)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-[11px] overflow-x-auto">
                        {current.code}
                    </pre>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-7 text-slate-300 hover:text-white hover:bg-slate-800"
                        onClick={() => copyCode(current.code)}
                    >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-2">{current.note}</p>
            </div>

            <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>
                    <span className="font-semibold">Fallback URL:</span>{" "}
                    <span className="font-mono">{fallbackUrl}</span>
                </p>
                <p className="mt-1">
                    Hosted on our domain — useful for testing or when you can&apos;t configure a reverse proxy.
                </p>
            </div>
        </div>
    )
}

// ─── Visibility section ──────────────────────────────────────────────────────

function VisibilitySection({
    pageId, visibility, hasAccessKey, onChanged,
}: {
    pageId: string
    visibility: "PUBLIC" | "PASSWORD"
    hasAccessKey: boolean
    onChanged: () => void
}) {
    const [mode, setMode] = useState<typeof visibility>(visibility)
    const [password, setPassword] = useState("")

    const setVisMut = api.statusPage.setVisibility.useMutation({
        onSuccess: (res) => {
            toast.success(res.message)
            setPassword("")
            onChanged()
        },
        onError: (e) => toast.error(e.message),
    })

    const handleSave = () => {
        if (mode === "PASSWORD" && !hasAccessKey && !password) {
            toast.error("Set a password first")
            return
        }
        setVisMut.mutate({
            id: pageId,
            visibility: mode,
            password: mode === "PASSWORD" && password ? password : undefined,
        })
    }

    return (
        <div className="space-y-4">
            <div>
                <Label>Visibility Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PUBLIC">Public — anyone can view</SelectItem>
                        <SelectItem value="PASSWORD">Password — visitors must enter a password</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                    Visibility applies to both the embed URL and the fallback URL — it&apos;s enforced on the server, not the proxy.
                </p>
            </div>

            {mode === "PASSWORD" && (
                <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
                    <Label htmlFor="vis-password" className="text-sm flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5" />
                        {hasAccessKey ? "New Password (leave blank to keep current)" : "Password"}
                    </Label>
                    <Input
                        id="vis-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                    />
                    <p className="text-xs text-muted-foreground">
                        Hashed with bcrypt before storage. Visitors enter it on the status page; access is granted via an HMAC-signed cookie for 24 hours. Brute-force protected (5 attempts / minute / IP).
                    </p>
                </div>
            )}

            {mode === "PASSWORD" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold">Heads up:</span>{" "}
                        Cookies are scoped to whatever domain the visitor is on, so password gating works seamlessly when the page is mounted at the user&apos;s own domain via reverse proxy.
                    </div>
                </div>
            )}

            <Button onClick={handleSave} disabled={setVisMut.isPending}>
                {setVisMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Visibility
            </Button>
        </div>
    )
}
