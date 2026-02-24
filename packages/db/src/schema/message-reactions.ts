import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateID } from "../lib/utils";
import { messages } from "./messages";
import { users } from "./users";

export const messageReactions = pgTable(
	"message_reactions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("mrxn")),
		messageId: text("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		emoji: text("emoji").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("message_reactions_message_id_idx").on(t.messageId),
		index("message_reactions_user_id_idx").on(t.userId),
		uniqueIndex("message_reactions_message_user_unique").on(
			t.messageId,
			t.userId
		),
	]
);
