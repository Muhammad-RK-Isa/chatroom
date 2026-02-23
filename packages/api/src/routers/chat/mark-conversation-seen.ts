import { db } from "@chatroom/db";
import { messageReceipts, messages } from "@chatroom/db/schema";
import {
	chatConversationInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import {
	chatErrorMap,
	loadConversationAccess,
	publishConversationEvents,
} from "./shared";

export const markConversationSeen = protectedProcedure
	.route({ method: "POST", path: "/chat/mark-seen" })
	.input(chatConversationInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const access = await loadConversationAccess(input.conversationId, userId);

		const unseenMessageRows = await db
			.select({ id: messages.id })
			.from(messages)
			.where(
				and(
					eq(messages.conversationId, access.conversation.id),
					ne(messages.senderUserId, userId)
				)
			);

		const messageIds = unseenMessageRows.map((message) => message.id);

		if (messageIds.length > 0) {
			await db
				.update(messageReceipts)
				.set({ deliveredAt: new Date(), seenAt: new Date() })
				.where(
					and(
						eq(messageReceipts.userId, userId),
						isNull(messageReceipts.seenAt),
						inArray(messageReceipts.messageId, messageIds)
					)
				);
		}

		publishConversationEvents(
			access.conversation.id,
			access.members.map((member) => member.userId)
		);

		return { success: true };
	});
