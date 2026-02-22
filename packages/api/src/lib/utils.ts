import { ORPCError } from "@orpc/server";

import type { Context } from "../context";

export function requireAuthenticatedUserId(context: Context): string {
	const userId = context.session?.user?.id;

	if (!userId) {
		throw new ORPCError("UNAUTHORIZED");
	}

	return userId;
}

export function createSortedUserPair(
	userOneId: string,
	userTwoId: string
): readonly [string, string] {
	return userOneId < userTwoId
		? [userOneId, userTwoId]
		: [userTwoId, userOneId];
}

export function uniqStringIds(ids: string[]): string[] {
	return [...new Set(ids.filter((id) => id.trim().length > 0))];
}

export function getIsTypingRecently(typingStartedAt: Date | null): boolean {
	if (!typingStartedAt) {
		return false;
	}

	const TYPING_ACTIVE_WINDOW_MS = 8000;

	return Date.now() - typingStartedAt.getTime() < TYPING_ACTIVE_WINDOW_MS;
}
