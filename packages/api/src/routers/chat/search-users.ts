import { db } from "@chatroom/db";
import { userPresences, users } from "@chatroom/db/schema";
import {
	chatSearchUsersInputSchema,
	chatSearchUsersOutputSchema,
} from "@chatroom/validators";
import { and, eq, ilike, ne, or } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import {
	getIsTypingRecently,
	requireAuthenticatedUserId,
} from "../../lib/utils";
import { chatErrorMap, toUserSummary } from "./shared";

const LEADING_AT_SYMBOL_REGEX = /^@/;

export const searchUsers = protectedProcedure
	.route({ method: "GET", path: "/chat/search-users" })
	.input(chatSearchUsersInputSchema)
	.output(chatSearchUsersOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const query = input.query.trim();

		if (query.length === 0) {
			return [];
		}

		const normalizedQuery = query.replace(LEADING_AT_SYMBOL_REGEX, "");
		const likeQuery = `%${normalizedQuery}%`;

		const userRows = await db
			.select()
			.from(users)
			.where(
				and(
					ne(users.id, userId),
					or(
						ilike(users.username, likeQuery),
						ilike(users.email, likeQuery),
						ilike(users.name, likeQuery)
					)
				)
			)
			.limit(25);

		if (userRows.length === 0) {
			return [];
		}

		const presenceRows = await db
			.select()
			.from(userPresences)
			.where(or(...userRows.map((user) => eq(userPresences.userId, user.id))));

		const presenceByUserId = new Map(
			presenceRows.map((presence) => [presence.userId, presence])
		);

		return userRows.map((user) => {
			const presence = presenceByUserId.get(user.id);

			return {
				user: toUserSummary(user),
				presence: {
					status: presence?.status ?? "offline",
					lastSeenAt: presence?.lastSeenAt ?? null,
					isTyping: getIsTypingRecently(presence?.typingStartedAt ?? null),
				},
			};
		});
	});
