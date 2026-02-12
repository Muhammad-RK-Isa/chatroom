import { pgTable, text } from "drizzle-orm/pg-core";
import { generateID, lifeCycleDates } from "../lib/utils";
import { users } from "./users";

export const messages = pgTable("messages", {
	id: text()
		.primaryKey()
		.$defaultFn(() => generateID("user")),
	sender: text("sender")
		.notNull()
		.references(() => users.id),
	content: text("content").notNull(),
	...lifeCycleDates,
});
