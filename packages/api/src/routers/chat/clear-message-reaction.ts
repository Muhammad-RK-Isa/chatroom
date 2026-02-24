import { db } from "@chatroom/db";
import { messageReactions } from "@chatroom/db/schema";
import {
	chatClearMessageReactionInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import {
	chatErrorMap,
	loadMessageAccess,
	publishConversationEvents,
} from "./shared";

export const clearMessageReaction = protectedProcedure
	.route({ method: "POST", path: "/chat/clear-message-reaction" })
	.input(chatClearMessageReactionInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const { message, access } = await loadMessageAccess(
			input.messageId,
			userId
		);

		await db
			.delete(messageReactions)
			.where(
				and(
					eq(messageReactions.messageId, message.id),
					eq(messageReactions.userId, userId)
				)
			);

		publishConversationEvents(
			message.conversationId,
			access.members.map((member) => member.userId)
		);

		return { success: true };
	});
