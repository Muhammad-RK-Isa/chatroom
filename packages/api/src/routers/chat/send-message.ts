import { db } from "@chatroom/db";
import { messageReceipts, messages, userPresences } from "@chatroom/db/schema";
import {
	chatSendMessageInputSchema,
	chatSendMessageOutputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { eq, inArray } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import { publishChatEventToUsers } from "./events";
import {
	chatErrorMap,
	ensureCanSendInConversation,
	isMessageVisibleToUser,
	loadConversationAccess,
	publishConversationEvents,
	resolvePresenceStatus,
} from "./shared";

export const sendMessage = protectedProcedure
	.route({ method: "POST", path: "/chat/send-message" })
	.input(chatSendMessageInputSchema)
	.output(chatSendMessageOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const senderName = context.session?.user.name ?? "Someone";
		const access = await loadConversationAccess(input.conversationId, userId);

		await ensureCanSendInConversation({
			conversation: access.conversation,
			membership: access.membership,
			members: access.members,
			currentUserId: userId,
		});

		if (input.replyToMessageId) {
			const [parentMessage] = await db
				.select({
					conversationId: messages.conversationId,
				})
				.from(messages)
				.where(eq(messages.id, input.replyToMessageId))
				.limit(1);

			if (
				!parentMessage ||
				parentMessage.conversationId !== access.conversation.id ||
				!(await isMessageVisibleToUser(input.replyToMessageId, userId))
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Reply target is not available",
				});
			}
		}

		const [createdMessage] = await db
			.insert(messages)
			.values({
				conversationId: access.conversation.id,
				senderUserId: userId,
				replyToMessageId: input.replyToMessageId ?? null,
				text: input.text,
			})
			.returning({ id: messages.id });

		if (!createdMessage) {
			throw new Error("Failed to save message");
		}

		const recipients = access.members.filter(
			(member) => member.userId !== userId
		);
		const recipientIds = recipients.map((recipient) => recipient.userId);

		const recipientPresenceRows =
			recipientIds.length > 0
				? await db
						.select()
						.from(userPresences)
						.where(inArray(userPresences.userId, recipientIds))
				: [];

		const recipientPresenceByUserId = new Map(
			recipientPresenceRows.map((presence) => [presence.userId, presence])
		);

		if (recipients.length > 0) {
			await db.insert(messageReceipts).values(
				recipients.map((recipient) => ({
					messageId: createdMessage.id,
					userId: recipient.userId,
					deliveredAt:
						resolvePresenceStatus(
							recipientPresenceByUserId.get(recipient.userId)
						) === "online"
							? new Date()
							: null,
				}))
			);
		}

		const unmutedRecipientIds = recipients
			.filter((recipient) => !recipient.isMuted)
			.map((recipient) => recipient.userId);

		publishConversationEvents(
			access.conversation.id,
			access.members.map((member) => member.userId)
		);

		if (unmutedRecipientIds.length > 0) {
			publishChatEventToUsers(unmutedRecipientIds, {
				type: "chat.new-message",
				messageId: createdMessage.id,
				conversationId: access.conversation.id,
				senderUserId: userId,
				senderName,
				preview: input.text.slice(0, 140),
				conversationName:
					access.conversation.type === "group"
						? (access.conversation.title ?? "Group")
						: senderName,
			});
		}

		return {
			messageId: createdMessage.id,
		};
	});
