import "server-only";
import { auth } from "./auth";
import { headers } from "next/headers";

// NOTE: NOT a server action. Plain server-side helper, called from RSC,
// route handlers, and the tRPC context. Marking it `"use server"` would force
// every call into a server-action RPC round-trip — that's the slow path we are
// explicitly avoiding here.
export async function serverSession() {
    return auth.api.getSession({
        headers: await headers(),
    });
}

export type ServerSession = Awaited<ReturnType<typeof serverSession>>;
