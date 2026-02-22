import type { AppRouterClient } from "@chatroom/api/routers/index";

import { env } from "@chatroom/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const GET_PROCEDURE_NAMES = new Set([
	"healthCheck",
	"listConversations",
	"getThread",
	"searchUsers",
	"stream",
]);

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			toast.error(`Error: ${error.message}`, {
				action: {
					label: "retry",
					onClick: query.invalidate,
				},
			});
		},
	}),
});

export const link = new RPCLink({
	url: `${env.VITE_SERVER_URL}/rpc`,
	method(_options, path) {
		const procedureName = path.at(-1);
		return GET_PROCEDURE_NAMES.has(procedureName ?? "") ? "GET" : "POST";
	},
	fetch(url, options) {
		return fetch(url, {
			...options,
			credentials: "include",
		});
	},
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
