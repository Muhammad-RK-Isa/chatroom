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

export const messageDeletions = pgTable(
	"message_deletions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("mdel")),
		messageId: text("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		deletedAt: timestamp("deleted_at").defaultNow().notNull(),
	},
	(t) => [
		index("message_deletions_message_id_idx").on(t.messageId),
		index("message_deletions_user_id_idx").on(t.userId),
		uniqueIndex("message_deletions_message_user_unique").on(
			t.messageId,
			t.userId
		),
	]
);
