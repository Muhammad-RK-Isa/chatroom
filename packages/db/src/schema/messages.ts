import { desc } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
		text: text("text").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("messages_conversation_id_created_at_idx").on(
			t.conversationId,
			desc(t.createdAt)
		),
		index("messages_sender_user_id_idx").on(t.senderUserId),
	]
);
