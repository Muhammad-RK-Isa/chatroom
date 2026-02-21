import { boolean, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";

export const users = pgTable(
	"users",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("usr")),
		name: text("name").notNull(),
		username: text("username").notNull(),
		email: text("email").notNull().unique(),
		emailVerified: boolean("email_verified").default(false).notNull(),
		image: text("image"),
		...lifeCycleDates,
	},
	(t) => [uniqueIndex().on(t.email), uniqueIndex().on(t.username)]
);
