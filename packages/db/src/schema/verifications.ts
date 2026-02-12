import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";

export const verifications = pgTable(
	"verifications",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("verif")),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		...lifeCycleDates,
	},
	(table) => [index("verifications_identifier_idx").on(table.identifier)]
);
