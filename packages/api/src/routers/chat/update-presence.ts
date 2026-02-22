import { db } from "@chatroom/db";
import { messageReceipts, messages, userPresences } from "@chatroom/db/schema";
import {
	chatSuccessOutputSchema,
	chatUpdatePresenceInputSchema,
} from "@chatroom/validators";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { protectedProcedure } from "../../index";
import { requireAuthenticatedUserId } from "../../lib/utils";
import { getConnectedChatUserIds, publishChatEventToUsers } from "./events";
import { chatErrorMap } from "./shared";

export const updatePresence = protectedProcedure
	.route({ method: "POST", path: "/chat/update-presence" })
	.input(chatUpdatePresenceInputSchema)
	.output(chatSuccessOutputSchema)
	.errors(chatErrorMap)
	.handler(async ({ context, input }) => {
		const userId = requireAuthenticatedUserId(context);
		const now = new Date();

		const undeliveredReceiptRows =
			input.status === "online"
				? await db
						.select({
							messageId: messageReceipts.messageId,
							conversationId: messages.conversationId,
						})
						.from(messageReceipts)
						.innerJoin(messages, eq(messages.id, messageReceipts.messageId))
						.where(
							and(
								eq(messageReceipts.userId, userId),
								isNull(messageReceipts.deliveredAt)
							)
						)
				: [];

		if (undeliveredReceiptRows.length > 0) {
			await db
				.update(messageReceipts)
				.set({ deliveredAt: now })
				.where(
					and(
						eq(messageReceipts.userId, userId),
						isNull(messageReceipts.deliveredAt),
						inArray(
							messageReceipts.messageId,
							undeliveredReceiptRows.map((row) => row.messageId)
						)
					)
				);
		}

		await db
			.insert(userPresences)
			.values({
				userId,
				status: input.status,
				lastSeenAt: now,
				typingConversationId: null,
				typingStartedAt: null,
			})
			.onConflictDoUpdate({
				target: userPresences.userId,
				set: {
					status: input.status,
					lastSeenAt: now,
					...(input.status === "offline"
						? {
								typingConversationId: null,
								typingStartedAt: null,
							}
						: {}),
				},
			});

		const targetUserIds = [...new Set(getConnectedChatUserIds())];

		publishChatEventToUsers(targetUserIds, {
			type: "chat.presence",
			userId,
			status: input.status,
		});

		const deliveredConversationIds = [
			...new Set(undeliveredReceiptRows.map((row) => row.conversationId)),
		];

		for (const conversationId of deliveredConversationIds) {
			publishChatEventToUsers(targetUserIds, {
				type: "chat.invalidate.thread",
				conversationId,
			});
		}

		return {
			success: true,
		};
	});
