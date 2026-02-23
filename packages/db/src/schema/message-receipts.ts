import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";
import { messages } from "./messages";
import { users } from "./users";

export const messageReceipts = pgTable(
	"message_receipts",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("mrct")),
		messageId: text("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		deliveredAt: timestamp("delivered_at"),
		seenAt: timestamp("seen_at"),
		...lifeCycleDates,
	},
	(t) => [
		index("message_receipts_message_id_idx").on(t.messageId),
		index("message_receipts_user_id_idx").on(t.userId),
		index("message_receipts_seen_at_idx").on(t.seenAt),
		uniqueIndex("message_receipts_message_user_unique").on(
			t.messageId,
			t.userId
		),
	]
);
