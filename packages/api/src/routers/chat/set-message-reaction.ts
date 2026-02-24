import { db } from "@chatroom/db";
import { messageReactions } from "@chatroom/db/schema";
import {
	chatSetMessageReactionInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import {
	chatErrorMap,
	isMessageVisibleToUser,
	loadMessageAccess,
	publishConversationEvents,
} from "./shared";

export const setMessageReaction = protectedProcedure
	.route({ method: "POST", path: "/chat/set-message-reaction" })
	.input(chatSetMessageReactionInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const { message, access } = await loadMessageAccess(
			input.messageId,
			userId
		);

		if (!(await isMessageVisibleToUser(message.id, userId))) {
			throw new ORPCError("NOT_FOUND", {
				message: "Message not found",
			});
		}

		await db
			.insert(messageReactions)
			.values({
				messageId: message.id,
				userId,
				emoji: input.emoji,
			})
			.onConflictDoUpdate({
				target: [messageReactions.messageId, messageReactions.userId],
				set: { emoji: input.emoji },
			});

		publishConversationEvents(
			message.conversationId,
			access.members.map((member) => member.userId)
		);

		return { success: true };
	});
