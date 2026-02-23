import { index, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";
import { users } from "./users";

export const conversationTypeEnum = pgEnum("conversation_type", [
	"dm",
	"group",
]);

export const conversations = pgTable(
	"conversations",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("conv")),
		type: conversationTypeEnum("type").notNull(),
		title: text("title"),
		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		dmUserOneId: text("dm_user_one_id").references(() => users.id, {
			onDelete: "set null",
		}),
		dmUserTwoId: text("dm_user_two_id").references(() => users.id, {
			onDelete: "set null",
		}),
		...lifeCycleDates,
	},
	(t) => [
		index("conversations_type_idx").on(t.type),
		index("conversations_created_by_user_id_idx").on(t.createdByUserId),
		uniqueIndex("conversations_dm_user_pair_unique").on(
			t.dmUserOneId,
			t.dmUserTwoId
		),
	]
);
