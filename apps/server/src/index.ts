import { createContext } from "@chatroom/api/context";
import { appRouter } from "@chatroom/api/routers/index";
import { auth } from "@chatroom/auth";
import { env } from "@chatroom/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

export const app = new Hono();

const resolveCorsOrigin = (
	origin: string | undefined,
	requestUrl: string
): string => {
	const requestOrigin = new URL(requestUrl).origin;
	const apiOrigin = new URL(env.BETTER_AUTH_URL).origin;

	if (!origin) {
		return requestOrigin;
	}

	if (
		origin === env.CORS_ORIGIN ||
		origin === requestOrigin ||
		origin === apiOrigin
	) {
		return origin;
	}

	return env.CORS_ORIGIN;
};

app.use(logger());
app.use(
	"/*",
	cors({
		origin: (origin, c) => resolveCorsOrigin(origin, c.req.url),
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: {
				info: {
					title: "Chatroom API Reference",
					version: "1.0.0",
				},
			},
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context,
	});

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: "/reference",
		context,
	});

	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response);
	}

	await next();
});

app.get("/", (c) => {
	return c.text("OK");
});

if (env.NODE_ENV !== "test") {
	// biome-ignore lint/correctness/noUndeclaredVariables: Bun is a runtime global
	Bun.serve({
		fetch: app.fetch,
		port: env.NODE_ENV === "development" ? 8000 : undefined,
	});
}
