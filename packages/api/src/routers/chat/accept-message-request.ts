import { db } from "@chatroom/db";
import { conversationMembers } from "@chatroom/db/schema";
import {
	chatConversationInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import {
	chatErrorMap,
	loadConversationAccess,
	publishConversationEvents,
} from "./shared";

export const acceptMessageRequest = protectedProcedure
	.route({ method: "POST", path: "/chat/accept-request" })
	.input(chatConversationInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const access = await loadConversationAccess(input.conversationId, userId);

		if (
			access.membership.requestStatus !== "pending" ||
			access.membership.requestedByUserId === userId
		) {
			throw new ORPCError("CONFLICT", {
				message: "This conversation does not have a pending request to accept",
			});
		}

		await db
			.update(conversationMembers)
			.set({ requestStatus: "accepted", requestedByUserId: null })
			.where(
				and(
					eq(conversationMembers.conversationId, access.conversation.id),
					eq(conversationMembers.userId, userId)
				)
			);

		publishConversationEvents(
			access.conversation.id,
			access.members.map((member) => member.userId)
		);

		return {
			success: true,
		};
	});
