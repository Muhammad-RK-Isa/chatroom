import { db } from "@chatroom/db";
import { conversationMembers, conversations, users } from "@chatroom/db/schema";
import {
	chatConversationIdOutputSchema,
	chatCreateGroupInputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { inArray } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId, uniqStringIds } from "../../lib/utils";
import { chatErrorMap, publishConversationEvents } from "./shared";

export const createGroup = protectedProcedure
	.route({ method: "POST", path: "/chat/create-group" })
	.input(chatCreateGroupInputSchema)
	.output(chatConversationIdOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const targetMemberIds = uniqStringIds(
			input.memberUserIds.filter((memberId) => memberId !== userId)
		);

		if (targetMemberIds.length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Pick at least one member for the group",
			});
		}

		const memberRows = await db
			.select()
			.from(users)
			.where(inArray(users.id, targetMemberIds));

		if (memberRows.length !== targetMemberIds.length) {
			throw new ORPCError("BAD_REQUEST", {
				message: "One or more selected members are invalid",
			});
		}

		const [createdConversation] = await db
			.insert(conversations)
			.values({
				type: "group",
				title: input.name,
				createdByUserId: userId,
			})
			.returning({ id: conversations.id });

		if (!createdConversation) {
			throw new Error("Failed to create group conversation");
		}

		await db.insert(conversationMembers).values([
			{
				conversationId: createdConversation.id,
				userId,
				requestStatus: "accepted",
			},
			...targetMemberIds.map((memberUserId) => ({
				conversationId: createdConversation.id,
				userId: memberUserId,
				requestStatus: "accepted" as const,
			})),
		]);

		publishConversationEvents(createdConversation.id, [
			userId,
			...targetMemberIds,
		]);

		return {
			conversationId: createdConversation.id,
		};
	});
