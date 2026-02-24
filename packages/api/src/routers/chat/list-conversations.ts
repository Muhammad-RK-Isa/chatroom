import { db } from "@chatroom/db";
import {
	conversationMembers,
	conversations,
	messageDeletions,
	messageReceipts,
	messages,
	userBlocks,
	userPresences,
	users,
} from "@chatroom/db/schema";
import {
	type ChatConversationListItem,
	chatListConversationsOutputSchema,
} from "@chatroom/validators";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import {
	getIsTypingRecently,
	requireAuthenticatedUserId,
} from "../../lib/utils";
import { chatErrorMap, resolvePresenceStatus, toUserSummary } from "./shared";

type ConversationRow = typeof conversations.$inferSelect;
type ConversationMemberRow = typeof conversationMembers.$inferSelect;
type UserRow = typeof users.$inferSelect;
type PresenceRow = typeof userPresences.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

function pickLastMessage(
	conversationId: string,
	messageByConversationId: Map<string, MessageRow>,
	userById: Map<string, UserRow>
): ChatConversationListItem["lastMessage"] {
	const lastMessage = messageByConversationId.get(conversationId);

	if (!lastMessage) {
		return null;
	}

	return {
		text: lastMessage.text,
		at: lastMessage.createdAt,
		senderName: userById.get(lastMessage.senderUserId)?.name ?? "Unknown user",
	};
}

function pickBlockedStateByPeer(
	peerUserId: string | undefined,
	blockedStateByPeerId: Map<
		string,
		"none" | "blocked_by_me" | "blocked_by_them"
	>
): "none" | "blocked_by_me" | "blocked_by_them" {
	if (!peerUserId) {
		return "none";
	}

	return blockedStateByPeerId.get(peerUserId) ?? "none";
}

function buildDmItem(options: {
	conversation: ConversationRow;
	currentUserId: string;
	members: ConversationMemberRow[];
	membership: ConversationMemberRow;
	userById: Map<string, UserRow>;
	presenceByUserId: Map<string, PresenceRow>;
	messageByConversationId: Map<string, MessageRow>;
	blockedStateByPeerId: Map<
		string,
		"none" | "blocked_by_me" | "blocked_by_them"
	>;
	unseenCount: number;
}): ChatConversationListItem {
	const {
		conversation,
		currentUserId,
		members,
		membership,
		userById,
		presenceByUserId,
		messageByConversationId,
		blockedStateByPeerId,
		unseenCount,
	} = options;

	const peerMember = members.find((member) => member.userId !== currentUserId);
	const peerUser = peerMember ? userById.get(peerMember.userId) : null;
	const peerPresence = peerMember
		? presenceByUserId.get(peerMember.userId)
		: null;

	return {
		id: conversation.id,
		type: conversation.type,
		name: peerUser?.name ?? "Unknown user",
		lastMessage: pickLastMessage(
			conversation.id,
			messageByConversationId,
			userById
		),
		unseenCount,
		muted: membership.isMuted,
		requestStatus: membership.requestStatus,
		blockedState: pickBlockedStateByPeer(
			peerMember?.userId,
			blockedStateByPeerId
		),
		dmPeer: peerUser
			? {
					user: toUserSummary(peerUser),
					presence: {
						status: resolvePresenceStatus(peerPresence),
						lastSeenAt: peerPresence?.lastSeenAt ?? null,
						isTyping:
							resolvePresenceStatus(peerPresence) === "online" &&
							peerPresence?.typingConversationId === conversation.id &&
							getIsTypingRecently(peerPresence?.typingStartedAt ?? null),
					},
				}
			: null,
		groupMeta: null,
	};
}

function buildGroupItem(options: {
	conversation: ConversationRow;
	currentUserId: string;
	members: ConversationMemberRow[];
	membership: ConversationMemberRow;
	userById: Map<string, UserRow>;
	presenceByUserId: Map<string, PresenceRow>;
	messageByConversationId: Map<string, MessageRow>;
	unseenCount: number;
}): ChatConversationListItem {
	const {
		conversation,
		currentUserId,
		members,
		membership,
		userById,
		presenceByUserId,
		messageByConversationId,
		unseenCount,
	} = options;

	const peerMembers = members.filter(
		(member) => member.userId !== currentUserId
	);
	const onlineCount = peerMembers.reduce((total, member) => {
		const presence = presenceByUserId.get(member.userId);
		return resolvePresenceStatus(presence) === "online" ? total + 1 : total;
	}, 0);

	const typingUserNames = peerMembers
		.filter((member) => {
			const presence = presenceByUserId.get(member.userId);
			return (
				resolvePresenceStatus(presence) === "online" &&
				presence?.typingConversationId === conversation.id &&
				getIsTypingRecently(presence.typingStartedAt)
			);
		})
		.map((member) => userById.get(member.userId)?.name ?? "Unknown user");

	return {
		id: conversation.id,
		type: conversation.type,
		name: conversation.title ?? "Untitled group",
		lastMessage: pickLastMessage(
			conversation.id,
			messageByConversationId,
			userById
		),
		unseenCount,
		muted: membership.isMuted,
		requestStatus: membership.requestStatus,
		blockedState: "none",
		dmPeer: null,
		groupMeta: {
			memberCount: members.length,
			onlineCount,
			typingUserNames,
		},
	};
}

function sortByActivity(
	items: ChatConversationListItem[],
	conversationById: Map<string, ConversationRow>
): ChatConversationListItem[] {
	return [...items].sort((left, right) => {
		const leftFallback =
			conversationById.get(left.id)?.createdAt.getTime() ?? 0;
		const rightFallback =
			conversationById.get(right.id)?.createdAt.getTime() ?? 0;
		const leftTime = left.lastMessage?.at.getTime() ?? leftFallback;
		const rightTime = right.lastMessage?.at.getTime() ?? rightFallback;

		return rightTime - leftTime;
	});
}

export const listConversations = protectedProcedure
	.route({ method: "GET", path: "/chat/conversations" })
	.output(chatListConversationsOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context }) => {
		const userId = requireAuthenticatedUserId(context);

		const memberships = await db
			.select()
			.from(conversationMembers)
			.where(eq(conversationMembers.userId, userId));

		if (memberships.length === 0) {
			return [];
		}

		const conversationIds = memberships.map(
			(membership) => membership.conversationId
		);

		const [conversationRows, memberRows] = await Promise.all([
			db
				.select()
				.from(conversations)
				.where(inArray(conversations.id, conversationIds)),
			db
				.select()
				.from(conversationMembers)
				.where(inArray(conversationMembers.conversationId, conversationIds)),
		]);

		const memberUserIds = [
			...new Set(memberRows.map((member) => member.userId)),
		];

		const [userRows, presenceRows, latestMessages] = await Promise.all([
			db.select().from(users).where(inArray(users.id, memberUserIds)),
			db
				.select()
				.from(userPresences)
				.where(inArray(userPresences.userId, memberUserIds)),
			db
				.select({
					id: messages.id,
					conversationId: messages.conversationId,
					senderUserId: messages.senderUserId,
					replyToMessageId: messages.replyToMessageId,
					text: messages.text,
					deletedAt: messages.deletedAt,
					createdAt: messages.createdAt,
				})
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
						inArray(messages.conversationId, conversationIds),
						isNull(messages.deletedAt),
						isNull(messageDeletions.id)
					)
				)
				.orderBy(desc(messages.createdAt)),
		]);

		const [incomingUnseenRows, outgoingUnseenRows] = await Promise.all([
			db
				.select({
					conversationId: messages.conversationId,
					count: sql<number>`count(*)`,
				})
				.from(messageReceipts)
				.innerJoin(messages, eq(messages.id, messageReceipts.messageId))
				.leftJoin(
					messageDeletions,
					and(
						eq(messageDeletions.messageId, messages.id),
						eq(messageDeletions.userId, userId)
					)
				)
				.where(
					and(
						eq(messageReceipts.userId, userId),
						isNull(messageReceipts.seenAt),
						ne(messages.senderUserId, userId),
						isNull(messages.deletedAt),
						isNull(messageDeletions.id),
						inArray(messages.conversationId, conversationIds)
					)
				)
				.groupBy(messages.conversationId),
			db
				.select({
					conversationId: messages.conversationId,
					count: sql<number>`count(*)`,
				})
				.from(messageReceipts)
				.innerJoin(messages, eq(messages.id, messageReceipts.messageId))
				.leftJoin(
					messageDeletions,
					and(
						eq(messageDeletions.messageId, messages.id),
						eq(messageDeletions.userId, userId)
					)
				)
				.where(
					and(
						eq(messages.senderUserId, userId),
						ne(messageReceipts.userId, userId),
						isNull(messageReceipts.seenAt),
						isNull(messages.deletedAt),
						isNull(messageDeletions.id),
						inArray(messages.conversationId, conversationIds)
					)
				)
				.groupBy(messages.conversationId),
		]);

		const membersByConversationId = new Map<string, ConversationMemberRow[]>();
		for (const member of memberRows) {
			const existingMembers =
				membersByConversationId.get(member.conversationId) ?? [];
			existingMembers.push(member);
			membersByConversationId.set(member.conversationId, existingMembers);
		}

		const userById = new Map(userRows.map((user) => [user.id, user]));
		const presenceByUserId = new Map(
			presenceRows.map((presence) => [presence.userId, presence])
		);

		const messageByConversationId = new Map<string, MessageRow>();
		for (const message of latestMessages) {
			if (!messageByConversationId.has(message.conversationId)) {
				messageByConversationId.set(message.conversationId, message);
			}
		}

		const incomingUnseenByConversationId = new Map(
			incomingUnseenRows.map((row) => [row.conversationId, Number(row.count)])
		);
		const outgoingUnseenByConversationId = new Map(
			outgoingUnseenRows.map((row) => [row.conversationId, Number(row.count)])
		);

		const membershipByConversationId = new Map(
			memberships.map((membership) => [membership.conversationId, membership])
		);

		const dmPeerIds = conversationRows
			.filter((conversation) => conversation.type === "dm")
			.map((conversation) => {
				const members = membersByConversationId.get(conversation.id) ?? [];
				return members.find((member) => member.userId !== userId)?.userId;
			})
			.filter((peerUserId): peerUserId is string => Boolean(peerUserId));

		const blockRows = dmPeerIds.length
			? await db
					.select()
					.from(userBlocks)
					.where(
						or(
							and(
								eq(userBlocks.blockerUserId, userId),
								inArray(userBlocks.blockedUserId, dmPeerIds)
							),
							and(
								eq(userBlocks.blockedUserId, userId),
								inArray(userBlocks.blockerUserId, dmPeerIds)
							)
						)
					)
			: [];

		const blockedStateByPeerId = new Map<
			string,
			"none" | "blocked_by_me" | "blocked_by_them"
		>();

		for (const blockRow of blockRows) {
			if (blockRow.blockerUserId === userId) {
				blockedStateByPeerId.set(blockRow.blockedUserId, "blocked_by_me");
			} else {
				blockedStateByPeerId.set(blockRow.blockerUserId, "blocked_by_them");
			}
		}

		const items = conversationRows.flatMap((conversation) => {
			const membership = membershipByConversationId.get(conversation.id);
			const members = membersByConversationId.get(conversation.id) ?? [];

			if (!membership) {
				return [];
			}

			const unseenCount =
				(incomingUnseenByConversationId.get(conversation.id) ?? 0) +
				(outgoingUnseenByConversationId.get(conversation.id) ?? 0);

			if (conversation.type === "dm") {
				return [
					buildDmItem({
						conversation,
						currentUserId: userId,
						members,
						membership,
						userById,
						presenceByUserId,
						messageByConversationId,
						blockedStateByPeerId,
						unseenCount,
					}),
				];
			}

			return [
				buildGroupItem({
					conversation,
					currentUserId: userId,
					members,
					membership,
					userById,
					presenceByUserId,
					messageByConversationId,
					unseenCount,
				}),
			];
		});

		const conversationById = new Map(
			conversationRows.map((conversation) => [conversation.id, conversation])
		);

		return sortByActivity(items, conversationById);
	});
