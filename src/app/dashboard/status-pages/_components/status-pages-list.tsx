'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/trpc/trpc-server/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, Trash2, ExternalLink, Plus, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { CreateStatusPage } from './create-status-page'
import type { RouterOutputs } from '@/trpc'

type StatusPages = RouterOutputs['statusPage']['getAll']['data']
type Projects = { id: string; projectName: string; _count: { endpoints: number } }[]

interface Props {
    initialPages: StatusPages
    projects: Projects
}

interface DeleteModalProps {
    title: string
    onConfirm: () => void
    onCancel: () => void
    isDeleting: boolean
}

function DeleteModal({ title, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">Delete Status Page</p>
                        <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground mb-5">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-foreground">&ldquo;{title}&rdquo;</span>?
                    The public URL will stop working immediately.
                </p>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onCancel}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="flex-1 gap-1.5"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...</>
                            : <><Trash2 className="h-3.5 w-3.5" /> Yes, Delete</>}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function StatusPagesList({ initialPages, projects }: Props) {
    const router = useRouter()
    const [showCreate, setShowCreate] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

    const { mutateAsync: deletePage, isPending: isDeleting } = api.statusPage.delete.useMutation({
        onError: (err) => toast.error(err.message),
    })

    async function handleConfirmDelete() {
        if (!deleteTarget) return
        await deletePage({ id: deleteTarget.id })
        toast.success('Status page deleted successfully')
        setDeleteTarget(null)
        router.refresh()
    }

    function copyLink(slug: string, id: string) {
        const url = `${window.location.origin}/status/${slug}`
        navigator.clipboard.writeText(url)
        setCopiedId(id)
        toast.success('Link copied!')
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <>
            {showCreate && (
                <CreateStatusPage
                    projects={projects}
                    onClose={() => setShowCreate(false)}
                />
            )}

            {deleteTarget && (
                <DeleteModal
                    title={deleteTarget.title}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                    isDeleting={isDeleting}
                />
            )}

            <div className="pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Status Pages</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Public pages to share your service status with users.
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> New Status Page
                </Button>
            </div>

            {initialPages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Globe className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-semibold text-lg">No Status Pages Yet</p>
                        <p className="text-muted-foreground text-sm mt-1">
                            Create a public status page to keep your users informed.
                        </p>
                    </div>
                    <Button onClick={() => setShowCreate(true)} className="gap-1.5 mt-2">
                        <Plus className="h-4 w-4" /> Create Status Page
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {initialPages.map(page => (
                        <Card key={page.id} className="border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                            <p className="font-semibold text-sm truncate">{page.title}</p>
                                        </div>
                                        {page.description && (
                                            <p className="text-xs text-muted-foreground mt-1 truncate pl-4">
                                                {page.description}
                                            </p>
                                        )}
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] shrink-0">Public</Badge>
                                </div>

                                <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-2 mb-3">
                                    <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-xs text-muted-foreground truncate flex-1">
                                        /status/{page.slug}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {page.projects.map(p => (
                                        <Badge key={p.id} variant="outline" className="text-[10px]">
                                            {p.projectName} · {p._count.endpoints} ep
                                        </Badge>
                                    ))}
                                </div>

                                <p className="text-[10px] text-muted-foreground mb-3">
                                    Created {new Date(page.createdAt).toLocaleDateString()}
                                </p>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-1 text-xs"
                                        onClick={() => copyLink(page.slug, page.id)}
                                    >
                                        {copiedId === page.id
                                            ? <><Check className="h-3 w-3" /> Copied</>
                                            : <><Copy className="h-3 w-3" /> Copy Link</>}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-xs"
                                        onClick={() => window.open(`/status/${page.slug}`, '_blank')}
                                    >
                                        <ExternalLink className="h-3 w-3" /> View
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                        onClick={() => setDeleteTarget({ id: page.id, title: page.title })}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    )
}
