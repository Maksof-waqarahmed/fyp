import URLsComponent from "@/components/urls/url-page"
import { api } from "@/trpc-server/server"

export default async function UrlsPage({ searchParams }: { searchParams: { page?: string } }) {
    const resolvedParams = await Promise.resolve(searchParams)
    const page = Number(resolvedParams?.page) || 1
    const limit = 10
    const { items, totalPages } = await api.urls.getAllURLs({ page, limit })
    return (
        <div className="min-h-screen">
            <URLsComponent
                items={items}
                totalPages={totalPages}
                currentPage={page}
            />
        </div>
    )
}
