import { initTRPC, TRPCError } from "@trpc/server";
import prisma from '@/lib/prisma';
import { ZodError } from "zod";
import { ServerSession } from "@/lib/auth-sever";

export const createTRPCContext = async (opts: { headers: Headers, session: ServerSession; }) => {
    return { session: opts.session, prisma };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
    errorFormatter: ({ shape, error }) => ({
        ...shape,
        data: {
            ...shape.data,
            zodError: error.cause instanceof ZodError ? error.cause.flatten() : null
        }
    })
})

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
        ctx: {
            session: { ...ctx.session, user: ctx.session.user },
        },
    });
});