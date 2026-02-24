import { z } from "zod";

export const chatIdSchema = z.string().min(1);

export const chatConversationTypeSchema = z.enum(["dm", "group"]);
export const chatRequestStatusSchema = z.enum(["accepted", "pending"]);
export const chatBlockedStateSchema = z.enum([
	"none",
	"blocked_by_me",
	"blocked_by_them",
]);
export const chatMessageDeliveryStatusSchema = z.enum([
	"sent",
	"delivered",
	"seen",
]);
export const chatDeleteMessageScopeSchema = z.enum(["me", "everyone"]);
export const chatPresenceStatusSchema = z.enum(["online", "offline"]);

export const chatUserSummarySchema = z.object({
	id: chatIdSchema,
	name: z.string().min(1),
	username: z.string().min(1),
	email: z.email(),
	image: z.string().nullable(),
});

export const chatUserPresenceSchema = z.object({
	status: chatPresenceStatusSchema,
	lastSeenAt: z.date().nullable(),
	isTyping: z.boolean(),
});

export const chatUserWithPresenceSchema = z.object({
	user: chatUserSummarySchema,
	presence: chatUserPresenceSchema,
});

export const chatConversationLastMessageSchema = z.object({
	text: z.string(),
	at: z.date(),
	senderName: z.string(),
});

export const chatConversationListItemSchema = z.object({
	id: chatIdSchema,
	type: chatConversationTypeSchema,
	name: z.string().min(1),
	lastMessage: chatConversationLastMessageSchema.nullable(),
	unseenCount: z.number().int().nonnegative(),
	muted: z.boolean(),
	requestStatus: chatRequestStatusSchema,
	blockedState: chatBlockedStateSchema,
	dmPeer: chatUserWithPresenceSchema.nullable(),
	groupMeta: z
		.object({
			memberCount: z.number().int().nonnegative(),
			onlineCount: z.number().int().nonnegative(),
			typingUserNames: z.array(z.string()),
		})
		.nullable(),
});

export const chatMessageSchema = z.object({
	id: chatIdSchema,
	conversationId: chatIdSchema,
	sender: chatUserSummarySchema,
	text: z.string().min(1),
	replyTo: z
		.object({
			id: chatIdSchema,
			senderName: z.string().min(1),
			text: z.string().min(1),
		})
		.nullable(),
	reactions: z.array(
		z.object({
			emoji: z.string().min(1).max(16),
			count: z.number().int().positive(),
		})
	),
	myReaction: z.string().min(1).max(16).nullable(),
	createdAt: z.date(),
	isOwn: z.boolean(),
	deliveryStatus: chatMessageDeliveryStatusSchema.nullable(),
});

export const chatThreadConversationSchema = z.object({
	id: chatIdSchema,
	type: chatConversationTypeSchema,
	name: z.string().min(1),
	muted: z.boolean(),
	requestStatus: chatRequestStatusSchema,
	blockedState: chatBlockedStateSchema,
	canSend: z.boolean(),
	showMessageRequestActions: z.boolean(),
	participants: z.array(chatUserWithPresenceSchema),
	groupMeta: z
		.object({
			memberCount: z.number().int().nonnegative(),
			onlineCount: z.number().int().nonnegative(),
		})
		.nullable(),
});

export const chatGetThreadOutputSchema = z.object({
	conversation: chatThreadConversationSchema,
	messages: z.array(chatMessageSchema),
	typingUserNames: z.array(z.string()),
});

export const chatListConversationsOutputSchema = z.array(
	chatConversationListItemSchema
);

export const chatSearchUsersInputSchema = z.object({
	query: z.string().trim().min(1).max(128),
});

export const chatSearchUsersOutputSchema = z.array(chatUserWithPresenceSchema);

export const chatOpenDmInputSchema = z.object({
	targetUserId: chatIdSchema,
});

export const chatCreateGroupInputSchema = z.object({
	name: z.string().trim().min(2).max(80),
	memberUserIds: z.array(chatIdSchema).min(1),
});

export const chatRenameGroupInputSchema = z.object({
	conversationId: chatIdSchema,
	name: z.string().trim().min(2).max(80),
});

export const chatConversationInputSchema = z.object({
	conversationId: chatIdSchema,
});

export const chatSendMessageInputSchema = z.object({
	conversationId: chatIdSchema,
	text: z.string().trim().min(1).max(2000),
	replyToMessageId: chatIdSchema.optional(),
});

export const chatSetTypingInputSchema = z.object({
	conversationId: chatIdSchema,
	isTyping: z.boolean(),
});

export const chatSetConversationMuteInputSchema = z.object({
	conversationId: chatIdSchema,
	muted: z.boolean(),
});

export const chatBlockUserInputSchema = z.object({
	targetUserId: chatIdSchema,
});

export const chatUpdatePresenceInputSchema = z.object({
	status: chatPresenceStatusSchema,
});

export const chatSetMessageReactionInputSchema = z.object({
	messageId: chatIdSchema,
	emoji: z.string().trim().min(1).max(16),
});

export const chatClearMessageReactionInputSchema = z.object({
	messageId: chatIdSchema,
});

export const chatDeleteMessageInputSchema = z.object({
	messageId: chatIdSchema,
	scope: chatDeleteMessageScopeSchema,
});

export const chatConversationIdOutputSchema = z.object({
	conversationId: chatIdSchema,
});

export const chatSendMessageOutputSchema = z.object({
	messageId: chatIdSchema,
});

export const chatSuccessOutputSchema = z.object({
	success: z.literal(true),
});

export const chatStreamEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("chat.connected"),
		at: z.date(),
	}),
	z.object({
		type: z.literal("chat.invalidate.conversations"),
	}),
	z.object({
		type: z.literal("chat.invalidate.thread"),
		conversationId: chatIdSchema,
	}),
	z.object({
		type: z.literal("chat.typing"),
		conversationId: chatIdSchema,
		userId: chatIdSchema,
		userName: z.string(),
		isTyping: z.boolean(),
	}),
	z.object({
		type: z.literal("chat.new-message"),
		messageId: chatIdSchema,
		conversationId: chatIdSchema,
		senderUserId: chatIdSchema,
		senderName: z.string(),
		preview: z.string(),
		conversationName: z.string(),
	}),
	z.object({
		type: z.literal("chat.presence"),
		userId: chatIdSchema,
		status: chatPresenceStatusSchema,
	}),
]);

export type ChatConversationListItem = z.infer<
	typeof chatConversationListItemSchema
>;
export type ChatGetThreadOutput = z.infer<typeof chatGetThreadOutputSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatMessageDeliveryStatus = z.infer<
	typeof chatMessageDeliveryStatusSchema
>;
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
