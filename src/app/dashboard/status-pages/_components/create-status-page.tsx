'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '@/trpc/trpc-server/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, X, Check, Loader2 } from 'lucide-react'

const schema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').trim(),
    slug: z
        .string()
        .min(2, 'Slug must be at least 2 characters')
        .max(60, 'Slug too long')
        .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens')
        .trim(),
    description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Project {
    id: string
    projectName: string
    _count: { endpoints: number }
}

interface Props {
    projects: Project[]
    onClose: () => void
}

export function CreateStatusPage({ projects, onClose }: Props) {
    const router = useRouter()
    const [selectedProjects, setSelectedProjects] = useState<string[]>([])
    const [projectError, setProjectError] = useState('')

    const { mutateAsync, isPending } = api.statusPage.create.useMutation({
        onError: (err) => toast.error(err.message),
    })

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { title: '', slug: '', description: '' },
    })

    const titleValue = form.watch('title')
    const autoSlug = (val: string) =>
        val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)

    function handleTitleChange(val: string) {
        form.setValue('title', val)
        if (!form.getValues('slug') || form.getValues('slug') === autoSlug(form.getValues('title').slice(0, -1))) {
            form.setValue('slug', autoSlug(val))
        }
    }

    function toggleProject(id: string) {
        setProjectError('')
        setSelectedProjects(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    async function onSubmit(values: FormValues) {
        if (selectedProjects.length === 0) {
            setProjectError('Select at least one project')
            return
        }
        await mutateAsync({ ...values, projectIds: selectedProjects })
        toast.success('Status page created!')
        router.refresh()
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg shadow-2xl border rounded-2xl">
                <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Create Status Page
                    </CardTitle>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </CardHeader>

                <CardContent className="px-5 pb-5">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            <FormField control={form.control} name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground font-medium">Page Title</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Acme Corp Status"
                                                {...field}
                                                onChange={e => handleTitleChange(e.target.value)}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField control={form.control} name="slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground font-medium">
                                            Public URL Slug
                                        </FormLabel>
                                        <FormControl>
                                            <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                                                <span className="px-3 py-2 text-xs text-muted-foreground bg-muted border-r shrink-0">
                                                    /status/
                                                </span>
                                                <input
                                                    {...field}
                                                    className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
                                                    placeholder="acme-corp"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField control={form.control} name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-muted-foreground font-medium">
                                            Description <span className="text-muted-foreground/60">(optional)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Real-time status of our services" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Project selection */}
                            <div>
                                <p className="text-xs text-muted-foreground font-medium mb-2">
                                    Select Projects to Monitor
                                </p>
                                {projects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-xl bg-muted/30">
                                        No projects found. Create a project first.
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                        {projects.map(p => {
                                            const selected = selectedProjects.includes(p.id)
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => toggleProject(p.id)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${selected
                                                        ? 'border-primary/50 bg-primary/5 text-primary'
                                                        : 'border-border hover:bg-muted/50'}`}
                                                >
                                                    <span className="font-medium truncate">{p.projectName}</span>
                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                        <Badge variant="outline" className="text-[10px] px-1.5">
                                                            {p._count.endpoints} endpoints
                                                        </Badge>
                                                        {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                                {projectError && (
                                    <p className="text-xs text-destructive mt-1">{projectError}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1" disabled={isPending}>
                                    {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Creating...</> : 'Create Page'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
