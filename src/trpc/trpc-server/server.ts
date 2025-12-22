import { headers } from "next/headers";
import { cache } from "react";
import { createTRPCContext } from "../trpc";
import { session } from '@/lib/auth/auth-client'
import { createCaller } from "../index";

const _headers = cache(async () => headers())
const createContext = cache(async () => {
    const heads = new Headers(await _headers());
    heads.set("x-trpc-source", "rsc");
    return createTRPCContext({
        headers: heads,
        session: session,
    })
})

export const api = createCaller(createContext);