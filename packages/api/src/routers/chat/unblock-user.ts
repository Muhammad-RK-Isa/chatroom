import { db } from "@chatroom/db";
import { conversations, userBlocks } from "@chatroom/db/schema";
import {
	chatBlockUserInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import { publishChatEventToUsers } from "./events";
import {
	chatErrorMap,
	getSortedDmPair,
	publishConversationEvents,
} from "./shared";

export const unblockUser = protectedProcedure
	.route({ method: "POST", path: "/chat/unblock-user" })
	.input(chatBlockUserInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);

		await db
			.delete(userBlocks)
			.where(
				and(
					eq(userBlocks.blockerUserId, userId),
					eq(userBlocks.blockedUserId, input.targetUserId)
				)
			);

		const [dmUserOneId, dmUserTwoId] = getSortedDmPair(
			userId,
			input.targetUserId
		);
		const [existingConversation] = await db
			.select({ id: conversations.id })
			.from(conversations)
			.where(
				and(
					eq(conversations.type, "dm"),
					eq(conversations.dmUserOneId, dmUserOneId),
					eq(conversations.dmUserTwoId, dmUserTwoId)
				)
			)
			.limit(1);

		if (existingConversation) {
			publishConversationEvents(existingConversation.id, [
				userId,
				input.targetUserId,
			]);
		} else {
			publishChatEventToUsers([userId, input.targetUserId], {
				type: "chat.invalidate.conversations",
			});
		}

		return {
			success: true,
		};
	});
