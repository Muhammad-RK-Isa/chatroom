import {
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";
import { conversations } from "./conversations";
import { users } from "./users";

export const conversationRequestStatusEnum = pgEnum(
	"conversation_request_status",
	["accepted", "pending"]
);

export const conversationMembers = pgTable(
	"conversation_members",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("cmem")),
		conversationId: text("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		requestStatus: conversationRequestStatusEnum("request_status")
			.notNull()
			.default("accepted"),
		requestedByUserId: text("requested_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		isMuted: boolean("is_muted").notNull().default(false),
		...lifeCycleDates,
	},
	(t) => [
		index("conversation_members_conversation_id_idx").on(t.conversationId),
		index("conversation_members_user_id_idx").on(t.userId),
		uniqueIndex("conversation_members_conversation_user_unique").on(
			t.conversationId,
			t.userId
		),
	]
);
