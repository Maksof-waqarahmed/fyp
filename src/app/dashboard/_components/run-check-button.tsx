"use client"

import { Button } from "@/components/ui/button"
import { api } from "@/trpc/trpc-server/react"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export function RunCheckButton() {
    const utils = api.useUtils()

    const mut = api.endpoint.runChecksNow.useMutation({
        onSuccess: (res) => {
            toast.success(
                res.checked > 0
                    ? `✅ Checked ${res.checked} endpoint${res.checked === 1 ? "" : "s"} — dashboard updated`
                    : res.message
            )
            // Refresh every dashboard query so new results show immediately.
            utils.invalidate()
        },
        onError: (e) => toast.error(e.message || "Check failed"),
    })

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            title="Run a monitoring check on all your endpoints right now"
        >
            {mut.isPending ? (
                <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
            ) : (
                <RefreshCw className="h-4 w-4 md:mr-2" />
            )}
            <span className="hidden md:inline">{mut.isPending ? "Checking…" : "Run Check Now"}</span>
        </Button>
    )
}
