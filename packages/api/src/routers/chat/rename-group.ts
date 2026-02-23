import { db } from "@chatroom/db";
import { conversations } from "@chatroom/db/schema";
import {
	chatRenameGroupInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import {
	chatErrorMap,
	loadConversationAccess,
	publishConversationEvents,
} from "./shared";

export const renameGroup = protectedProcedure
	.route({ method: "POST", path: "/chat/rename-group" })
	.input(chatRenameGroupInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const access = await loadConversationAccess(input.conversationId, userId);

		if (access.conversation.type !== "group") {
			throw new ORPCError("BAD_REQUEST", {
				message: "Only group chats can be renamed",
			});
		}

		await db
			.update(conversations)
			.set({ title: input.name })
			.where(eq(conversations.id, access.conversation.id));

		publishConversationEvents(
			access.conversation.id,
			access.members.map((member) => member.userId)
		);

		return { success: true };
	});
