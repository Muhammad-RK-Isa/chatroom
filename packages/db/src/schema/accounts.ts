import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { generateID, lifeCycleDates } from "../lib/utils";
import { users } from "./users";

export const accounts = pgTable(
	"accounts",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => generateID("acc")),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		...lifeCycleDates,
	},
	(table) => [index("accounts_userId_idx").on(table.userId)]
);
