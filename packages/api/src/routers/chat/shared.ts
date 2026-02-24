import { db } from "@chatroom/db";
import {
	conversationMembers,
	conversations,
	messageDeletions,
	type messageReceipts,
	messages,
	userBlocks,
	type userPresences,
	type users,
} from "@chatroom/db/schema";
import type { ChatMessageDeliveryStatus } from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { createSortedUserPair } from "../../lib/utils";
import { publishChatEventToUsers } from "./events";

export const chatErrorMap = {
	BAD_REQUEST: { message: "Invalid chat request" },
	FORBIDDEN: { message: "You do not have access to this chat resource" },
	NOT_FOUND: { message: "Chat resource not found" },
	CONFLICT: { message: "Chat action conflicts with current state" },
} as const;

const PRESENCE_STALE_AFTER_MS = 45_000;

export function toUserSummary(user: typeof users.$inferSelect) {
	return {
		id: user.id,
		name: user.name,
		username: user.username,
		email: user.email,
		image: user.image ?? null,
	};
}

export function resolvePresenceStatus(
	presence: typeof userPresences.$inferSelect | null | undefined
): "online" | "offline" {
	if (!presence) {
		return "offline";
	}

	if (presence.status !== "online") {
		return "offline";
	}

	if (!presence.lastSeenAt) {
		return "offline";
	}

	const isFresh =
		Date.now() - presence.lastSeenAt.getTime() <= PRESENCE_STALE_AFTER_MS;

	return isFresh ? "online" : "offline";
}

export async function loadConversationAccess(
	conversationId: string,
	userId: string
): Promise<{
	conversation: typeof conversations.$inferSelect;
	membership: typeof conversationMembers.$inferSelect;
	members: (typeof conversationMembers.$inferSelect)[];
}> {
	const [membership] = await db
		.select()
		.from(conversationMembers)
		.where(
			and(
				eq(conversationMembers.conversationId, conversationId),
				eq(conversationMembers.userId, userId)
			)
		)
		.limit(1);

	if (!membership) {
		throw new ORPCError("NOT_FOUND", {
			message: "Conversation not found",
		});
	}

	const [conversation] = await db
		.select()
		.from(conversations)
		.where(eq(conversations.id, conversationId))
		.limit(1);

	if (!conversation) {
		throw new ORPCError("NOT_FOUND", {
			message: "Conversation not found",
		});
	}

	const members = await db
		.select()
		.from(conversationMembers)
		.where(eq(conversationMembers.conversationId, conversationId));

	return {
		conversation,
		membership,
		members,
	};
}

export async function loadMessageAccess(messageId: string, userId: string) {
	const [message] = await db
		.select()
		.from(messages)
		.where(eq(messages.id, messageId));

	if (!message) {
		throw new ORPCError("NOT_FOUND", {
			message: "Message not found",
		});
	}

	const access = await loadConversationAccess(message.conversationId, userId);

	return {
		message,
		access,
	};
}

export async function isMessageVisibleToUser(
	messageId: string,
	userId: string
): Promise<boolean> {
	const [message] = await db
		.select({ id: messages.id })
		.from(messages)
		.leftJoin(
			messageDeletions,
			and(
				eq(messageDeletions.messageId, messages.id),
				eq(messageDeletions.userId, userId)
			)
		)
		.where(
			and(
				eq(messages.id, messageId),
				isNull(messages.deletedAt),
				isNull(messageDeletions.id)
			)
		)
		.limit(1);

	return Boolean(message);
}

export function getDmPeerUserId(
	members: (typeof conversationMembers.$inferSelect)[],
	currentUserId: string
): string | null {
	const peer = members.find((member) => member.userId !== currentUserId);

	return peer?.userId ?? null;
}

export async function getDmBlockedState(
	currentUserId: string,
	peerUserId: string
): Promise<"none" | "blocked_by_me" | "blocked_by_them"> {
	const [blockedRelation] = await db
		.select()
		.from(userBlocks)
		.where(
			or(
				and(
					eq(userBlocks.blockerUserId, currentUserId),
					eq(userBlocks.blockedUserId, peerUserId)
				),
				and(
					eq(userBlocks.blockerUserId, peerUserId),
					eq(userBlocks.blockedUserId, currentUserId)
				)
			)
		)
		.limit(1);

	if (!blockedRelation) {
		return "none";
	}

	return blockedRelation.blockerUserId === currentUserId
		? "blocked_by_me"
		: "blocked_by_them";
}

export async function ensureCanSendInConversation(options: {
	conversation: typeof conversations.$inferSelect;
	membership: typeof conversationMembers.$inferSelect;
	members: (typeof conversationMembers.$inferSelect)[];
	currentUserId: string;
}): Promise<void> {
	const { conversation, membership, members, currentUserId } = options;

	if (
		membership.requestStatus === "pending" &&
		membership.requestedByUserId !== currentUserId
	) {
		throw new ORPCError("FORBIDDEN", {
			message: "You need to accept this message request before replying",
		});
	}

	if (conversation.type === "dm") {
		const peerUserId = getDmPeerUserId(members, currentUserId);

		if (!peerUserId) {
			throw new ORPCError("NOT_FOUND", {
				message: "Conversation not found",
			});
		}

		const blockedState = await getDmBlockedState(currentUserId, peerUserId);

		if (blockedState !== "none") {
			throw new ORPCError("FORBIDDEN", {
				message: "Messages are disabled because one of the users is blocked",
			});
		}
	}
}

export function getMessageDeliveryStatus(
	receipts: (typeof messageReceipts.$inferSelect)[]
): ChatMessageDeliveryStatus {
	if (receipts.length === 0) {
		return "seen";
	}

	const allSeen = receipts.every((receipt) => receipt.seenAt !== null);

	if (allSeen) {
		return "seen";
	}

	const allDelivered = receipts.every(
		(receipt) => receipt.deliveredAt !== null
	);

	if (allDelivered) {
		return "delivered";
	}

	return "sent";
}

export function publishConversationEvents(
	conversationId: string,
	memberUserIds: string[]
): void {
	publishChatEventToUsers(memberUserIds, {
		type: "chat.invalidate.conversations",
	});

	publishChatEventToUsers(memberUserIds, {
		type: "chat.invalidate.thread",
		conversationId,
	});
}

export function getSortedDmPair(
	userId: string,
	targetUserId: string
): readonly [string, string] {
	return createSortedUserPair(userId, targetUserId);
}

export type MessageRow = typeof messages.$inferSelect;
