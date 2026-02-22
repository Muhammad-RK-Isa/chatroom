import { db } from "@chatroom/db";
import {
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
				.select()
				.from(messages)
				.where(eq(messages.conversationId, access.conversation.id))
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
		const receiptRows =
			messageIds.length > 0
				? await db
						.select()
						.from(messageReceipts)
						.where(inArray(messageReceipts.messageId, messageIds))
				: [];

		const receiptsByMessageId = new Map<
			string,
			(typeof receiptRows)[number][]
		>();
		for (const receipt of receiptRows) {
			const receipts = receiptsByMessageId.get(receipt.messageId) ?? [];
			receipts.push(receipt);
			receiptsByMessageId.set(receipt.messageId, receipts);
		}

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
