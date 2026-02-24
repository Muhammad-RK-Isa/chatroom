import { db } from "@chatroom/db";
import { messageDeletions, messages } from "@chatroom/db/schema";
import {
	chatDeleteMessageInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import {
	chatErrorMap,
	loadMessageAccess,
	publishConversationEvents,
} from "./shared";

export const deleteMessage = protectedProcedure
	.route({ method: "POST", path: "/chat/delete-message" })
	.input(chatDeleteMessageInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const { message, access } = await loadMessageAccess(
			input.messageId,
			userId
		);

		if (input.scope === "everyone") {
			if (message.senderUserId !== userId) {
				throw new ORPCError("FORBIDDEN", {
					message: "You can only delete your own messages for everyone",
				});
			}

			await db
				.update(messages)
				.set({ deletedAt: new Date() })
				.where(eq(messages.id, message.id));
		} else {
			await db
				.insert(messageDeletions)
				.values({
					messageId: message.id,
					userId,
					deletedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [messageDeletions.messageId, messageDeletions.userId],
					set: { deletedAt: new Date() },
				});
		}

		publishConversationEvents(
			message.conversationId,
			access.members.map((member) => member.userId)
		);

		return { success: true };
	});
