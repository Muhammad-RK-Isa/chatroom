import { createContext } from "@chatroom/api/context";
import { subscribeToChatEvents } from "@chatroom/api/routers/chat/events";
import { appRouter } from "@chatroom/api/routers/index";
import { auth } from "@chatroom/auth";
import { env } from "@chatroom/env/server";
import type {
	ChatSocketClientToServerEvents,
	ChatSocketServerToClientEvents,
} from "@chatroom/validators";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Server as Engine } from "@socket.io/bun-engine";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server } from "socket.io";

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

const socketEngine = new Engine({
	path: "/socket.io/",
	cors: {
		origin: [env.CORS_ORIGIN],
		credentials: true,
	},
});

interface ChatSocketData {
	userId: string;
}

const io = new Server<
	ChatSocketClientToServerEvents,
	ChatSocketServerToClientEvents,
	Record<never, never>,
	ChatSocketData
>();

io.bind(socketEngine);

function createHeadersFromHandshake(
	headers: Record<string, string | string[] | undefined>
): Headers {
	const normalizedHeaders = new Headers();

	for (const [name, value] of Object.entries(headers)) {
		if (!value) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				normalizedHeaders.append(name, item);
			}
			continue;
		}

		normalizedHeaders.set(name, value);
	}

	return normalizedHeaders;
}

io.use(async (socket, next) => {
	const session = await auth.api.getSession({
		headers: createHeadersFromHandshake(socket.handshake.headers),
	});

	const userId = session?.user.id;

	if (!userId) {
		next(new Error("Unauthorized"));
		return;
	}

	socket.data.userId = userId;
	next();
});

io.on("connection", (socket) => {
	const unsubscribe = subscribeToChatEvents(socket.data.userId, (event) => {
		socket.emit("chat:event", event);
	});

	socket.emit("chat:event", {
		type: "chat.connected",
		at: new Date(),
	});

	socket.on("disconnect", () => {
		unsubscribe();
	});
});

const socketHandler = socketEngine.handler();

function isSocketRequest(pathname: string): boolean {
	return (
		pathname === "/socket.io" ||
		pathname === "/socket.io/" ||
		pathname.startsWith("/socket.io/")
	);
}

if (env.NODE_ENV !== "test") {
	Bun.serve({
		fetch(request, server) {
			const pathname = new URL(request.url).pathname;

			if (isSocketRequest(pathname)) {
				return socketEngine.handleRequest(request, server);
			}

			return app.fetch(request, server);
		},
		port: env.NODE_ENV === "development" ? 8000 : undefined,
		idleTimeout: socketHandler.idleTimeout,
		maxRequestBodySize: socketHandler.maxRequestBodySize,
		websocket: socketHandler.websocket,
	});
}
