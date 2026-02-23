import type { RouterClient } from "@orpc/server";
import { chatRouter } from "./chat";
import { healthCheck } from "./health-check";

export const appRouter = {
	healthCheck,
	chat: chatRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
