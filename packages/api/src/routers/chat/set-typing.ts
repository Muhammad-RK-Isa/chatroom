import { db } from "@chatroom/db";
import { userPresences } from "@chatroom/db/schema";
import {
	chatSetTypingInputSchema,
	chatSuccessOutputSchema,
} from "@chatroom/validators";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import { publishChatEventToUsers } from "./events";
import {
	chatErrorMap,
	ensureCanSendInConversation,
	loadConversationAccess,
} from "./shared";

export const setTyping = protectedProcedure
	.route({ method: "POST", path: "/chat/set-typing" })
	.input(chatSetTypingInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const access = await loadConversationAccess(input.conversationId, userId);

		if (input.isTyping) {
			await ensureCanSendInConversation({
				conversation: access.conversation,
				membership: access.membership,
				members: access.members,
				currentUserId: userId,
			});
		}

		await db
			.insert(userPresences)
			.values({
				userId,
				status: "online",
				lastSeenAt: new Date(),
				typingConversationId: input.isTyping ? input.conversationId : null,
				typingStartedAt: input.isTyping ? new Date() : null,
			})
			.onConflictDoUpdate({
				target: userPresences.userId,
				set: {
					status: "online",
					lastSeenAt: new Date(),
					typingConversationId: input.isTyping ? input.conversationId : null,
					typingStartedAt: input.isTyping ? new Date() : null,
				},
			});

		const participantIds = access.members.map((member) => member.userId);

		publishChatEventToUsers(participantIds, {
			type: "chat.typing",
			conversationId: input.conversationId,
			userId,
			userName: context.session?.user.name ?? "Someone",
			isTyping: input.isTyping,
		});

		return {
			success: true,
		};
	});
