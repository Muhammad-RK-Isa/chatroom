import { db } from "@chatroom/db";
import { conversations, userBlocks, users } from "@chatroom/db/schema";
import {
	chatBlockUserInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import { publishChatEventToUsers } from "./events";
import {
	chatErrorMap,
	getSortedDmPair,
	publishConversationEvents,
} from "./shared";

export const blockUser = protectedProcedure
	.route({ method: "POST", path: "/chat/block-user" })
	.input(chatBlockUserInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);

		if (input.targetUserId === userId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "You cannot block yourself",
			});
		}

		const [targetUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, input.targetUserId))
			.limit(1);

		if (!targetUser) {
			throw new ORPCError("NOT_FOUND", {
				message: "User not found",
			});
		}

		await db
			.insert(userBlocks)
			.values({
				blockerUserId: userId,
				blockedUserId: input.targetUserId,
			})
			.onConflictDoNothing({
				target: [userBlocks.blockerUserId, userBlocks.blockedUserId],
			});

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
