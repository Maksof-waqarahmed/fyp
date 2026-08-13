import { ServerSession, serverSession } from "@/lib/auth-sever";
import { createTRPCContext } from "@/trpc";
import { appRouter } from "@/trpc/api/routes";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

// Node runtime + a longer budget so the manual "Run Check Now" mutation
// (which runs a full monitoring pass) doesn't get cut off on serverless.
export const runtime = "nodejs";
export const maxDuration = 60;

// function setCorsHeaders(res: Response) {
//     res.headers.set("Access-Control-Allow-Origin", "*");
//     res.headers.set("Access-Control-Request-Method", "*");
//     res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
//     res.headers.set("Access-Control-Allow-Headers", "*");
// }

// export function OPTIONS() {
//     const response = new Response(null, { status: 204 });
//     setCorsHeaders(response);
//     return response;
// }

async function handler(req: Request) {

    const session: ServerSession = await serverSession();

    const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        router: appRouter,
        req,
        createContext: () =>
            createTRPCContext({
                session,
                headers: req.headers,
            }),
        onError({ error, path }) {
            console.error(`>>> tRPC Error on '${path}'`, error);
        },
    });

    // setCorsHeaders(response);
    return response;
}

export { handler as GET, handler as POST };
