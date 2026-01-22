import { createTRPCRouter } from "../trpc";
import { dashboardAnalysis } from "./router/dashboard-analysis";
import { project } from "./router/endpoints";
import { userSetting } from "./router/user-setting";

export const appRouter = createTRPCRouter({
    project,
    dashboardAnalysis,
    userSetting
})

// export type definition of API
export type AppRouter = typeof appRouter;