import { pgTable, text } from "drizzle-orm/pg-core";
import { chats } from "./chats";
import { users } from "./users";

export const usersChats = pgTable("users_chats", {
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	chatId: text("chat_id")
		.notNull()
		.references(() => chats.id),
});
