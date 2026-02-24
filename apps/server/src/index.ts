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

export const app = new Hono();
app.use(
	"/*",
	cors({
		origin: (origin) => origin || env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

function logORPCError(error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);

	if (
		message.includes("AbortError") ||
		message.includes("aborted") ||
		message.includes("The operation was aborted")
	) {
		return;
	}

	const code =
		typeof error === "object" && error !== null && "code" in error
			? String((error as { code?: unknown }).code ?? "")
			: "";

	if (
		code === "BAD_REQUEST" ||
		code === "UNAUTHORIZED" ||
		code === "FORBIDDEN" ||
		code === "NOT_FOUND" ||
		code === "CONFLICT"
	) {
		return;
	}

	console.error(error);
}

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
			docsPath: "/reference",
		}),
	],
	interceptors: [
		onError((error) => {
			logORPCError(error);
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			logORPCError(error);
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
		prefix: "/api",
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
	Bun.serve({
		fetch: app.fetch,
		port: env.NODE_ENV === "development" ? 8000 : undefined,
	});
}
