import { pgTable, text } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";

export const chats = pgTable("chats", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => generateID("chat")),
	title: text("title"),
	...lifeCycleDates,
});
