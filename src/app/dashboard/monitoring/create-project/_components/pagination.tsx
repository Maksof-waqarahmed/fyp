"use client"

import {
    Pagination as PaginationUI,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface PaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {

    if (totalPages <= 1) return null

    const getPages = () => {
        const pages: number[] = []

        const start = Math.max(1, page - 1)
        const end = Math.min(totalPages, page + 2)

        if (start > 1) {
            pages.push(1)
            if (start > 2) pages.push(-1)
        }

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        if (end < totalPages) {
            if (end < totalPages - 1) pages.push(-1)
            pages.push(totalPages)
        }

        return pages
    }

    const pages = getPages()

    return (
        <PaginationUI>
            <PaginationContent>

                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => page > 1 && onPageChange(page - 1)}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

                {pages.map((p, index) =>
                    p === -1 ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={p}>
                            <PaginationLink
                                isActive={p === page}
                                onClick={() => onPageChange(p)}
                                className="cursor-pointer"
                            >
                                {p}
                            </PaginationLink>
                        </PaginationItem>
                    )
                )}

                <PaginationItem>
                    <PaginationNext
                        onClick={() => page < totalPages && onPageChange(page + 1)}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

            </PaginationContent>
        </PaginationUI>
    )
}
