"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    TRPCClientError,
    httpBatchStreamLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { toast } from "sonner";
import { AppRouter } from "../api/routes";

export const api = createTRPCReact<AppRouter>();

export function TRPCReactProvider(props: {
    children: React.ReactNode;
    headersPromise: Promise<Headers>;
}) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        refetchOnWindowFocus: false,
                        staleTime: 30 * 1000,
                        retry: (failureCount, error) => {
                            if (handleErrorOnClient(error)) return false;
                            return failureCount < 3;
                        },
                    },
                    mutations: {
                        retry: (_, error) => {
                            handleErrorOnClient(error);
                            return false;
                        },
                    },
                },
            }),
    );

    const [trpcClient] = useState(() =>
        api.createClient({
            links: [
                httpBatchStreamLink({
                    url: getBaseUrl() + "/api/trpc",
                    async headers() {
                        const headers = new Headers(await props.headersPromise);
                        headers.set("x-trpc-source", "nextjs-react");
                        return headers;
                    },
                }),
            ],
        }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
                {props.children}
            </api.Provider>
        </QueryClientProvider>
    );
}

function getBaseUrl() {
    if (typeof window !== "undefined") return window.location.origin;
    return `http://localhost:${process.env.PORT ?? 3000}`;
}

function handleErrorOnClient(error: unknown): boolean {
    if (!(error instanceof TRPCClientError)) return false;
    // TODO: handle authentication errors
    if (error.data?.code === "UNAUTHORIZED") {
        return true;
    }
    setTimeout(() => {
        toast.error(error.message.slice(0, 50) + "...", { id: "error" });
    }, 0)
    return true;
}