import { env } from "@chatroom/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

// biome-ignore lint/performance/noNamespaceImport: drizzle requires the schema namespace object
import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, {
	schema,
	casing: "snake_case",
	logger: env.NODE_ENV !== "production",
});
