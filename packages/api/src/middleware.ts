import { ORPCError } from "@orpc/server";

import { o } from "./procedure";

export const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}

	return await next({
		context: {
			session: context.session,
		},
	});
});
