import { createTRPCRouter } from "../trpc";
import { createProject } from "./router/endpoints";

export const appRouter = createTRPCRouter({
    project: createProject
})

// export type definition of API
export type AppRouter = typeof appRouter;