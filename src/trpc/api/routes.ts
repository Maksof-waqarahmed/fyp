import { createTRPCRouter } from "../trpc";
import { dashboardAnalysis } from "./router/dashboard-analysis";
import { endpoint } from "./router/endPoint";
import { project } from "./router/project";
import { userSetting } from "./router/user-setting";

export const appRouter = createTRPCRouter({
    project,
    endpoint,
    dashboardAnalysis,
    userSetting,
})

export type AppRouter = typeof appRouter;