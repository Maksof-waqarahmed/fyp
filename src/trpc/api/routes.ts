import { createTRPCRouter } from "../trpc";
import { dashboardAnalysis } from "./router/dashboard-analysis";
import { project } from "./router/endpoints";

export const appRouter = createTRPCRouter({
    project,
    dashboardAnalysis
})

// export type definition of API
export type AppRouter = typeof appRouter;