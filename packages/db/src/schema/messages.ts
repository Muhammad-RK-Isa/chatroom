import { desc } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { generateID } from "../lib/utils";
import { conversations } from "./conversations";
import { users } from "./users";

export const messages = pgTable(
	"messages",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("msg")),
		conversationId: text("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		senderUserId: text("sender_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		replyToMessageId: text("reply_to_message_id"),
		text: text("text").notNull(),
		deletedAt: timestamp("deleted_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		foreignKey({
			columns: [t.replyToMessageId],
			foreignColumns: [t.id],
			name: "messages_reply_to_message_id_fkey",
		}).onDelete("set null"),
		index("messages_conversation_id_created_at_idx").on(
			t.conversationId,
			desc(t.createdAt)
		),
		index("messages_sender_user_id_idx").on(t.senderUserId),
		index("messages_deleted_at_idx").on(t.deletedAt),
		index("messages_reply_to_message_id_idx").on(t.replyToMessageId),
	]
);
