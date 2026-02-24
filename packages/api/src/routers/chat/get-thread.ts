import { db } from "@chatroom/db";
import {
	messageDeletions,
	messageReactions,
	messageReceipts,
	messages,
	userPresences,
	users,
} from "@chatroom/db/schema";
import {
	chatConversationInputSchema,
	chatGetThreadOutputSchema,
} from "@chatroom/validators";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import {
	getIsTypingRecently,
	requireAuthenticatedUserId,
} from "../../lib/utils";
import {
	chatErrorMap,
	ensureCanSendInConversation,
	getDmBlockedState,
	getMessageDeliveryStatus,
	loadConversationAccess,
	resolvePresenceStatus,
	toUserSummary,
} from "./shared";

export const getThread = protectedProcedure
	.route({ method: "GET", path: "/chat/thread" })
	.input(chatConversationInputSchema)
	.output(chatGetThreadOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const access = await loadConversationAccess(input.conversationId, userId);

		const memberUserIds = access.members.map((member) => member.userId);
		const [userRows, presenceRows, messageRows] = await Promise.all([
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
						eq(messages.conversationId, access.conversation.id),
						isNull(messages.deletedAt),
						isNull(messageDeletions.id)
					)
				)
				.orderBy(asc(messages.createdAt)),
		]);

		const userById = new Map(userRows.map((user) => [user.id, user]));
		const presenceByUserId = new Map(
			presenceRows.map((presence) => [presence.userId, presence])
		);

		const otherUserMessageIds = messageRows
			.filter((message) => message.senderUserId !== userId)
			.map((message) => message.id);

		if (otherUserMessageIds.length > 0) {
			await db
				.update(messageReceipts)
				.set({ deliveredAt: new Date() })
				.where(
					and(
						eq(messageReceipts.userId, userId),
						isNull(messageReceipts.deliveredAt),
						inArray(messageReceipts.messageId, otherUserMessageIds)
					)
				);
		}

		const messageIds = messageRows.map((message) => message.id);
		const [receiptRows, reactionRows] = await Promise.all([
			messageIds.length > 0
				? db
						.select()
						.from(messageReceipts)
						.where(inArray(messageReceipts.messageId, messageIds))
				: Promise.resolve([]),
			messageIds.length > 0
				? db
						.select({
							messageId: messageReactions.messageId,
							userId: messageReactions.userId,
							emoji: messageReactions.emoji,
						})
						.from(messageReactions)
						.where(inArray(messageReactions.messageId, messageIds))
				: Promise.resolve([]),
		]);

		const receiptsByMessageId = new Map<
			string,
			(typeof receiptRows)[number][]
		>();
		for (const receipt of receiptRows) {
			const receipts = receiptsByMessageId.get(receipt.messageId) ?? [];
			receipts.push(receipt);
			receiptsByMessageId.set(receipt.messageId, receipts);
		}

		const reactionsByMessageId = new Map<string, Map<string, number>>();
		const myReactionByMessageId = new Map<string, string>();
		for (const reaction of reactionRows) {
			const reactionsByEmoji =
				reactionsByMessageId.get(reaction.messageId) ??
				new Map<string, number>();
			reactionsByEmoji.set(
				reaction.emoji,
				(reactionsByEmoji.get(reaction.emoji) ?? 0) + 1
			);
			reactionsByMessageId.set(reaction.messageId, reactionsByEmoji);

			if (reaction.userId === userId) {
				myReactionByMessageId.set(reaction.messageId, reaction.emoji);
			}
		}

		const replyToMessageIds = [
			...new Set(
				messageRows
					.map((message) => message.replyToMessageId)
					.filter((messageId): messageId is string => messageId !== null)
			),
		];
		const replyToRows =
			replyToMessageIds.length > 0
				? await db
						.select({
							id: messages.id,
							senderUserId: messages.senderUserId,
							text: messages.text,
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
								eq(messages.conversationId, access.conversation.id),
								inArray(messages.id, replyToMessageIds),
								isNull(messages.deletedAt),
								isNull(messageDeletions.id)
							)
						)
				: [];
		const replyToById = new Map(replyToRows.map((row) => [row.id, row]));

		const peerMember = access.members.find(
			(member) => member.userId !== userId
		);
		const blockedState =
			access.conversation.type === "dm" && peerMember
				? await getDmBlockedState(userId, peerMember.userId)
				: "none";

		let canSend = true;
		try {
			await ensureCanSendInConversation({
				conversation: access.conversation,
				membership: access.membership,
				members: access.members,
				currentUserId: userId,
			});
		} catch {
			canSend = false;
		}

		const typingUserNames = access.members
			.filter((member) => member.userId !== userId)
			.filter((member) => {
				const presence = presenceByUserId.get(member.userId);
				return (
					resolvePresenceStatus(presence) === "online" &&
					presence?.typingConversationId === access.conversation.id &&
					getIsTypingRecently(presence.typingStartedAt)
				);
			})
			.map((member) => userById.get(member.userId)?.name ?? "Unknown user");

		const onlineCount = access.members
			.filter((member) => member.userId !== userId)
			.reduce((count, member) => {
				const presence = presenceByUserId.get(member.userId);
				return resolvePresenceStatus(presence) === "online" ? count + 1 : count;
			}, 0);

		const threadMessages = messageRows.map((message) => {
			const sender = userById.get(message.senderUserId);

			if (!sender) {
				throw new Error("Sender should exist for conversation message");
			}

			const receipts = receiptsByMessageId.get(message.id) ?? [];
			const deliveryStatus =
				message.senderUserId === userId
					? getMessageDeliveryStatus(
							receipts.filter((receipt) => receipt.userId !== userId)
						)
					: null;

			return {
				id: message.id,
				conversationId: message.conversationId,
				sender: toUserSummary(sender),
				text: message.text,
				replyTo: message.replyToMessageId
					? (() => {
							const parentMessage = replyToById.get(message.replyToMessageId);
							if (!parentMessage) {
								return null;
							}

							return {
								id: parentMessage.id,
								senderName:
									userById.get(parentMessage.senderUserId)?.name ??
									"Unknown user",
								text: parentMessage.text,
							};
						})()
					: null,
				reactions: [...(reactionsByMessageId.get(message.id) ?? new Map())].map(
					([emoji, count]) => ({
						emoji,
						count,
					})
				),
				myReaction: myReactionByMessageId.get(message.id) ?? null,
				createdAt: message.createdAt,
				isOwn: message.senderUserId === userId,
				deliveryStatus,
			};
		});

		const participants = access.members.flatMap((member) => {
			const user = userById.get(member.userId);

			if (!user) {
				return [];
			}

			const presence = presenceByUserId.get(member.userId);

			return [
				{
					user: toUserSummary(user),
					presence: {
						status: resolvePresenceStatus(presence),
						lastSeenAt: presence?.lastSeenAt ?? null,
						isTyping:
							resolvePresenceStatus(presence) === "online" &&
							presence?.typingConversationId === access.conversation.id &&
							getIsTypingRecently(presence?.typingStartedAt ?? null),
					},
				},
			];
		});

		return {
			conversation: {
				id: access.conversation.id,
				type: access.conversation.type,
				name:
					access.conversation.type === "dm"
						? ((peerMember && userById.get(peerMember.userId)?.name) ??
							"Unknown user")
						: (access.conversation.title ?? "Untitled group"),
				muted: access.membership.isMuted,
				requestStatus: access.membership.requestStatus,
				blockedState,
				canSend,
				showMessageRequestActions:
					access.membership.requestStatus === "pending" &&
					access.membership.requestedByUserId !== userId,
				participants,
				groupMeta:
					access.conversation.type === "group"
						? {
								memberCount: access.members.length,
								onlineCount,
							}
						: null,
			},
			messages: threadMessages,
			typingUserNames,
		};
	});
