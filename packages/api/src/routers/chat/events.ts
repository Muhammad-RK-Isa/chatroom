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

export async function* subscribeChatEvents(
	userId: string,
	signal: AbortSignal
): AsyncGenerator<ChatStreamEvent, void, void> {
	const queue: ChatStreamEvent[] = [];
	let resume: (() => void) | null = null;

	const listener: ChatEventListener = (event) => {
		queue.push(event);
		if (resume) {
			resume();
			resume = null;
		}
	};

	addListener(userId, listener);

	try {
		while (!signal.aborted) {
			if (queue.length === 0) {
				await new Promise<void>((resolve) => {
					resume = resolve;
					signal.addEventListener(
						"abort",
						() => {
							if (resume) {
								resume();
								resume = null;
							}
							resolve();
						},
						{ once: true }
					);
				});
			}

			while (queue.length > 0) {
				const nextEvent = queue.shift();

				if (!nextEvent) {
					continue;
				}

				yield nextEvent;
			}
		}
	} finally {
		removeListener(userId, listener);
	}
}
