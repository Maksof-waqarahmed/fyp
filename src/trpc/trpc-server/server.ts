import { headers } from "next/headers";
import { cache } from "react";
import { createTRPCContext } from "../trpc";
import { ServerSession, serverSession } from "@/lib/auth-sever";
import { createCaller } from "../index";


const _headers = cache(async () => headers())
const createContext = cache(async () => {
    const heads = new Headers(await _headers());
    heads.set("x-trpc-source", "rsc");
    const session: ServerSession = await serverSession();
    return createTRPCContext({
        headers: heads,
        session
    })
})

export const api = createCaller(createContext);