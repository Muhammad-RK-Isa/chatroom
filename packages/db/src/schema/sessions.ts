import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";
import { users } from "./users";

export const sessions = pgTable(
	"sessions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("sess")),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		...lifeCycleDates,
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => [index("sessions_userId_idx").on(table.userId)]
);
