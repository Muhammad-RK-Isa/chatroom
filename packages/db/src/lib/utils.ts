import { randomUUIDv7 } from "bun";
import { sql } from "drizzle-orm";
import { timestamp } from "drizzle-orm/pg-core";

export function generateID(prefix?: string): string {
	const uuid = randomUUIDv7();
	return prefix ? `${prefix}_${uuid}` : uuid;
}

export function lower(str: string) {
	return sql<string>`lower(${str})`;
}

export const lifeCycleDates = {
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").$onUpdate(
		() => /* @__PURE__ */ new Date()
	),
};
