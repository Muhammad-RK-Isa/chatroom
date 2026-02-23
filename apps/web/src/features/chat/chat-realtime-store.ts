import { create } from "zustand";

export type ChatRealtimeConnectionStatus =
	| "idle"
	| "connecting"
	| "connected"
	| "disconnected";

interface ChatRealtimeStoreState {
	connectionStatus: ChatRealtimeConnectionStatus;
	typingNamesByConversationId: Record<string, Record<string, string>>;
	setConnectionStatus: (status: ChatRealtimeConnectionStatus) => void;
	upsertTypingUser: (
		conversationId: string,
		userId: string,
		userName: string
	) => void;
	removeTypingUser: (conversationId: string, userId: string) => void;
	clearTypingUsers: () => void;
}

export const useChatRealtimeStore = create<ChatRealtimeStoreState>()((set) => ({
	connectionStatus: "idle",
	typingNamesByConversationId: {},
	setConnectionStatus: (status) => {
		set({ connectionStatus: status });
	},
	upsertTypingUser: (conversationId, userId, userName) => {
		set((state) => ({
			typingNamesByConversationId: {
				...state.typingNamesByConversationId,
				[conversationId]: {
					...(state.typingNamesByConversationId[conversationId] ?? {}),
					[userId]: userName,
				},
			},
		}));
	},
	removeTypingUser: (conversationId, userId) => {
		set((state) => {
			const conversationTypingMap =
				state.typingNamesByConversationId[conversationId];

			if (!conversationTypingMap?.[userId]) {
				return state;
			}

			const nextConversationTypingMap = { ...conversationTypingMap };
			delete nextConversationTypingMap[userId];

			if (Object.keys(nextConversationTypingMap).length === 0) {
				const nextTypingNamesByConversationId = {
					...state.typingNamesByConversationId,
				};
				delete nextTypingNamesByConversationId[conversationId];

				return {
					typingNamesByConversationId: nextTypingNamesByConversationId,
				};
			}

			return {
				typingNamesByConversationId: {
					...state.typingNamesByConversationId,
					[conversationId]: nextConversationTypingMap,
				},
			};
		});
	},
	clearTypingUsers: () => {
		set({ typingNamesByConversationId: {} });
	},
}));
