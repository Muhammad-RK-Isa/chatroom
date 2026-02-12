import { boolean, pgTable, text } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";

export const users = pgTable("users", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => generateID("user")),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	...lifeCycleDates,
});
