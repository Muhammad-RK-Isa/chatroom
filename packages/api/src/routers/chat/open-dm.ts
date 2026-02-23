import { db } from "@chatroom/db";
import { conversationMembers, conversations, users } from "@chatroom/db/schema";
import {
	chatConversationIdOutputSchema,
	chatOpenDmInputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import {
	chatErrorMap,
	getSortedDmPair,
	publishConversationEvents,
} from "./shared";

export const openDm = protectedProcedure
	.route({ method: "POST", path: "/chat/open-dm" })
	.input(chatOpenDmInputSchema)
	.output(chatConversationIdOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);

		if (input.targetUserId === userId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "You cannot open a DM with yourself",
			});
		}

		const [targetUser] = await db
			.select()
			.from(users)
			.where(eq(users.id, input.targetUserId))
			.limit(1);

		if (!targetUser) {
			throw new ORPCError("NOT_FOUND", {
				message: "User not found",
			});
		}

		const [dmUserOneId, dmUserTwoId] = getSortedDmPair(
			userId,
			input.targetUserId
		);

		const [existingConversation] = await db
			.select()
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
			return { conversationId: existingConversation.id };
		}

		const [newConversation] = await db
			.insert(conversations)
			.values({
				type: "dm",
				createdByUserId: userId,
				dmUserOneId,
				dmUserTwoId,
			})
			.returning({ id: conversations.id });

		if (!newConversation) {
			throw new Error("Failed to create DM conversation");
		}

		await db.insert(conversationMembers).values([
			{
				conversationId: newConversation.id,
				userId,
				requestStatus: "accepted",
				requestedByUserId: userId,
			},
			{
				conversationId: newConversation.id,
				userId: input.targetUserId,
				requestStatus: "pending",
				requestedByUserId: userId,
			},
		]);

		publishConversationEvents(newConversation.id, [userId, input.targetUserId]);

		return {
			conversationId: newConversation.id,
		};
	});
