import { createTRPCRouter } from "../trpc";
import { dashboardAnalysis } from "./router/dashboard-analysis";
import { endpoint } from "./router/endPoint";
import { logs } from "./router/log";
import { project } from "./router/project";
import { userSetting } from "./router/user-setting";
import { statusPage } from "./router/status-page";

export const appRouter = createTRPCRouter({
    project,
    endpoint,
    dashboardAnalysis,
    userSetting,
    logs,
    statusPage,
})

export type AppRouter = typeof appRouter;