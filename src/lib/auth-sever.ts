import { auth } from "./auth/auth"
import { headers } from "next/headers"

export const serverSession = async () => {
    "use server";
    return await auth.api.getSession({
        headers: await headers()
    })
};

export type ServerSession = Awaited<ReturnType<typeof serverSession>>;