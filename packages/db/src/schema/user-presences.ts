import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { lifeCycleDates } from "../lib/utils";
import { conversations } from "./conversations";
import { users } from "./users";

export const userPresenceStatusEnum = pgEnum("user_presence_status", [
	"online",
	"offline",
]);

export const userPresences = pgTable(
	"user_presences",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => users.id, { onDelete: "cascade" }),
		status: userPresenceStatusEnum("status").notNull().default("offline"),
		lastSeenAt: timestamp("last_seen_at"),
		typingConversationId: text("typing_conversation_id").references(
			() => conversations.id,
			{
				onDelete: "set null",
			}
		),
		typingStartedAt: timestamp("typing_started_at"),
		...lifeCycleDates,
	},
	(t) => [
		index("user_presences_typing_conversation_id_idx").on(
			t.typingConversationId
		),
	]
);
