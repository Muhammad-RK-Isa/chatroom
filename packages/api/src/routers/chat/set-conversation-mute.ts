import { db } from "@chatroom/db";
import { conversationMembers } from "@chatroom/db/schema";
import {
	chatSetConversationMuteInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import { publishChatEventToUsers } from "./events";
import { chatErrorMap, loadConversationAccess } from "./shared";

export const setConversationMute = protectedProcedure
	.route({ method: "POST", path: "/chat/set-conversation-mute" })
	.input(chatSetConversationMuteInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		await loadConversationAccess(input.conversationId, userId);

		await db
			.update(conversationMembers)
			.set({ isMuted: input.muted })
			.where(
				and(
					eq(conversationMembers.conversationId, input.conversationId),
					eq(conversationMembers.userId, userId)
				)
			);

		publishChatEventToUsers([userId], {
			type: "chat.invalidate.conversations",
		});

		publishChatEventToUsers([userId], {
			type: "chat.invalidate.thread",
			conversationId: input.conversationId,
		});

		return {
			success: true,
		};
	});
