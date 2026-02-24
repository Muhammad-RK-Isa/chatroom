import { relations } from "drizzle-orm";

import { accounts } from "./accounts";
import { conversationMembers } from "./conversation-members";
import { conversations } from "./conversations";
import { messageDeletions } from "./message-deletions";
import { messageReactions } from "./message-reactions";
import { messageReceipts } from "./message-receipts";
import { messages } from "./messages";
import { sessions } from "./sessions";
import { userBlocks } from "./user-blocks";
import { userPresences } from "./user-presences";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	conversationMemberships: many(conversationMembers, {
		relationName: "conversation_member_user",
	}),
	messageRequestsInitiated: many(conversationMembers, {
		relationName: "conversation_member_requested_by",
	}),
	createdConversations: many(conversations, {
		relationName: "conversation_created_by",
	}),
	dmConversationsAsUserOne: many(conversations, {
		relationName: "conversation_dm_user_one",
	}),
	dmConversationsAsUserTwo: many(conversations, {
		relationName: "conversation_dm_user_two",
	}),
	sentMessages: many(messages),
	messageReceipts: many(messageReceipts),
	messageReactions: many(messageReactions),
	messageDeletions: many(messageDeletions),
	blocksInitiated: many(userBlocks, { relationName: "user_block_initiator" }),
	blocksReceived: many(userBlocks, { relationName: "user_block_target" }),
	presences: many(userPresences),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const conversationsRelations = relations(
	conversations,
	({ many, one }) => ({
		members: many(conversationMembers),
		messages: many(messages),
		createdByUser: one(users, {
			relationName: "conversation_created_by",
			fields: [conversations.createdByUserId],
			references: [users.id],
		}),
		dmUserOne: one(users, {
			relationName: "conversation_dm_user_one",
			fields: [conversations.dmUserOneId],
			references: [users.id],
		}),
		dmUserTwo: one(users, {
			relationName: "conversation_dm_user_two",
			fields: [conversations.dmUserTwoId],
			references: [users.id],
		}),
	})
);

export const conversationMembersRelations = relations(
	conversationMembers,
	({ one }) => ({
		conversation: one(conversations, {
			fields: [conversationMembers.conversationId],
			references: [conversations.id],
		}),
		user: one(users, {
			relationName: "conversation_member_user",
			fields: [conversationMembers.userId],
			references: [users.id],
		}),
		requestedByUser: one(users, {
			relationName: "conversation_member_requested_by",
			fields: [conversationMembers.requestedByUserId],
			references: [users.id],
		}),
	})
);

export const messagesRelations = relations(messages, ({ many, one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
	sender: one(users, {
		fields: [messages.senderUserId],
		references: [users.id],
	}),
	receipts: many(messageReceipts),
	reactions: many(messageReactions),
	deletions: many(messageDeletions),
	replyToMessage: one(messages, {
		relationName: "message_reply_to",
		fields: [messages.replyToMessageId],
		references: [messages.id],
	}),
	replies: many(messages, {
		relationName: "message_reply_to",
	}),
}));

export const messageReceiptsRelations = relations(
	messageReceipts,
	({ one }) => ({
		message: one(messages, {
			fields: [messageReceipts.messageId],
			references: [messages.id],
		}),
		user: one(users, {
			fields: [messageReceipts.userId],
			references: [users.id],
		}),
	})
);

export const messageReactionsRelations = relations(
	messageReactions,
	({ one }) => ({
		message: one(messages, {
			fields: [messageReactions.messageId],
			references: [messages.id],
		}),
		user: one(users, {
			fields: [messageReactions.userId],
			references: [users.id],
		}),
	})
);

export const messageDeletionsRelations = relations(
	messageDeletions,
	({ one }) => ({
		message: one(messages, {
			fields: [messageDeletions.messageId],
			references: [messages.id],
		}),
		user: one(users, {
			fields: [messageDeletions.userId],
			references: [users.id],
		}),
	})
);

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
	blocker: one(users, {
		relationName: "user_block_initiator",
		fields: [userBlocks.blockerUserId],
		references: [users.id],
	}),
	blocked: one(users, {
		relationName: "user_block_target",
		fields: [userBlocks.blockedUserId],
		references: [users.id],
	}),
}));

export const userPresencesRelations = relations(userPresences, ({ one }) => ({
	user: one(users, {
		fields: [userPresences.userId],
		references: [users.id],
	}),
	typingConversation: one(conversations, {
		fields: [userPresences.typingConversationId],
		references: [conversations.id],
	}),
}));
