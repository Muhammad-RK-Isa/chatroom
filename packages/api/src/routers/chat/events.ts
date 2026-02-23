import type { ChatStreamEvent } from "@chatroom/validators";

type ChatEventListener = (event: ChatStreamEvent) => void;

const listenersByUserId = new Map<string, Set<ChatEventListener>>();

export function getConnectedChatUserIds(): string[] {
	return [...listenersByUserId.keys()];
}

function addListener(userId: string, listener: ChatEventListener): void {
	const listeners =
		listenersByUserId.get(userId) ?? new Set<ChatEventListener>();
	listeners.add(listener);
	listenersByUserId.set(userId, listeners);
}

function removeListener(userId: string, listener: ChatEventListener): void {
	const listeners = listenersByUserId.get(userId);

	if (!listeners) {
		return;
	}

	listeners.delete(listener);

	if (listeners.size === 0) {
		listenersByUserId.delete(userId);
	}
}

export function subscribeToChatEvents(
	userId: string,
	listener: ChatEventListener
): () => void {
	addListener(userId, listener);

	return () => {
		removeListener(userId, listener);
	};
}

export function publishChatEventToUsers(
	userIds: string[],
	event: ChatStreamEvent
): void {
	for (const userId of new Set(userIds)) {
		const listeners = listenersByUserId.get(userId);

		if (!listeners) {
			continue;
		}

		for (const listener of listeners) {
			listener(event);
		}
	}
}
