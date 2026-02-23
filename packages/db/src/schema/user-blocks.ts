import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";
import { users } from "./users";

export const userBlocks = pgTable(
	"user_blocks",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("ublk")),
		blockerUserId: text("blocker_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		blockedUserId: text("blocked_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		...lifeCycleDates,
	},
	(t) => [
		index("user_blocks_blocker_user_id_idx").on(t.blockerUserId),
		index("user_blocks_blocked_user_id_idx").on(t.blockedUserId),
		uniqueIndex("user_blocks_pair_unique").on(t.blockerUserId, t.blockedUserId),
	]
);
