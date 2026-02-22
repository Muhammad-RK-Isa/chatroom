import type { ChatStreamEvent } from "@chatroom/validators";
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { orpc, queryClient } from "~/utils/orpc";

interface UseChatRealtimeOptions {
	conversationId?: string;
	currentUserId?: string;
	streamEvent: ChatStreamEvent | undefined;
	onOpenConversation: (conversationId: string) => void;
	updatePresence: (input: { status: "online" | "offline" }) => void;
}

const TYPING_EXPIRE_MS = 3500;
const TYPING_STOP_DELAY_MS = 1000;
const ONLINE_PRESENCE_INVALIDATION_THROTTLE_MS = 30_000;
const DUPLICATE_EVENT_WINDOW_MS = 1500;

function removeTypingUser(
	conversationId: string,
	userId: string,
	setTypingNamesByConversationId: Dispatch<
		SetStateAction<Record<string, Record<string, string>>>
	>
): void {
	setTypingNamesByConversationId((previousState) => {
		const currentConversationMap = previousState[conversationId];

		if (!currentConversationMap?.[userId]) {
			return previousState;
		}

		const nextConversationMap = { ...currentConversationMap };
		delete nextConversationMap[userId];

		if (Object.keys(nextConversationMap).length === 0) {
			const nextState = { ...previousState };
			delete nextState[conversationId];
			return nextState;
		}

		return {
			...previousState,
			[conversationId]: nextConversationMap,
		};
	});
}

function invalidateConversationList(): void {
	queryClient.invalidateQueries({
		queryKey: orpc.chat.listConversations.queryKey(),
	});
}

function invalidateThread(conversationId: string): void {
	queryClient.invalidateQueries({
		queryKey: orpc.chat.getThread.queryKey({
			input: { conversationId },
		}),
	});
}

function getEventDedupKey(streamEvent: ChatStreamEvent): string {
	switch (streamEvent.type) {
		case "chat.connected":
			return `connected:${streamEvent.at.getTime()}`;
		case "chat.invalidate.conversations":
			return "invalidate.conversations";
		case "chat.invalidate.thread":
			return `invalidate.thread:${streamEvent.conversationId}`;
		case "chat.presence":
			return `presence:${streamEvent.userId}:${streamEvent.status}`;
		case "chat.typing":
			return `typing:${streamEvent.conversationId}:${streamEvent.userId}:${streamEvent.isTyping}`;
		case "chat.new-message":
			return `new-message:${streamEvent.messageId}`;
		default:
			return "unknown";
	}
}

function handleTypingStreamEvent(options: {
	streamEvent: Extract<ChatStreamEvent, { type: "chat.typing" }>;
	currentUserId?: string;
	typingExpiryTimersRef: MutableRefObject<Map<string, number>>;
	setTypingNamesByConversationId: Dispatch<
		SetStateAction<Record<string, Record<string, string>>>
	>;
}): void {
	const {
		streamEvent,
		currentUserId,
		typingExpiryTimersRef,
		setTypingNamesByConversationId,
	} = options;

	if (streamEvent.userId === currentUserId) {
		return;
	}

	const typingTimerKey = `${streamEvent.conversationId}:${streamEvent.userId}`;
	const currentTimer = typingExpiryTimersRef.current.get(typingTimerKey);
	if (currentTimer) {
		window.clearTimeout(currentTimer);
		typingExpiryTimersRef.current.delete(typingTimerKey);
	}

	if (streamEvent.isTyping) {
		setTypingNamesByConversationId((previousState) => ({
			...previousState,
			[streamEvent.conversationId]: {
				...(previousState[streamEvent.conversationId] ?? {}),
				[streamEvent.userId]: streamEvent.userName,
			},
		}));

		const expiryTimer = window.setTimeout(() => {
			removeTypingUser(
				streamEvent.conversationId,
				streamEvent.userId,
				setTypingNamesByConversationId
			);
			typingExpiryTimersRef.current.delete(typingTimerKey);
		}, TYPING_EXPIRE_MS);

		typingExpiryTimersRef.current.set(typingTimerKey, expiryTimer);
		return;
	}

	const stopTimer = window.setTimeout(() => {
		removeTypingUser(
			streamEvent.conversationId,
			streamEvent.userId,
			setTypingNamesByConversationId
		);
		typingExpiryTimersRef.current.delete(typingTimerKey);
	}, TYPING_STOP_DELAY_MS);

	typingExpiryTimersRef.current.set(typingTimerKey, stopTimer);
}

function handleNonTypingStreamEvent(options: {
	streamEvent: Exclude<ChatStreamEvent, { type: "chat.typing" }>;
	conversationId?: string;
	onOpenConversation: (conversationId: string) => void;
	setTypingNamesByConversationId: Dispatch<
		SetStateAction<Record<string, Record<string, string>>>
	>;
	lastOnlinePresenceInvalidationAtRef: MutableRefObject<number>;
	shownToastMessageIdsRef: MutableRefObject<Set<string>>;
}): void {
	const {
		streamEvent,
		conversationId,
		onOpenConversation,
		setTypingNamesByConversationId,
		lastOnlinePresenceInvalidationAtRef,
		shownToastMessageIdsRef,
	} = options;

	if (streamEvent.type === "chat.connected") {
		return;
	}

	if (streamEvent.type === "chat.invalidate.conversations") {
		invalidateConversationList();
		return;
	}

	if (streamEvent.type === "chat.invalidate.thread") {
		invalidateThread(streamEvent.conversationId);
		invalidateConversationList();
		return;
	}

	if (streamEvent.type === "chat.presence") {
		if (streamEvent.status === "offline") {
			invalidateConversationList();
			if (conversationId) {
				invalidateThread(conversationId);
			}
			return;
		}

		const now = Date.now();
		if (
			now - lastOnlinePresenceInvalidationAtRef.current >=
			ONLINE_PRESENCE_INVALIDATION_THROTTLE_MS
		) {
			lastOnlinePresenceInvalidationAtRef.current = now;
			invalidateConversationList();
		}
		return;
	}

	if (streamEvent.type === "chat.new-message") {
		removeTypingUser(
			streamEvent.conversationId,
			streamEvent.senderUserId,
			setTypingNamesByConversationId
		);

		if (streamEvent.conversationId === conversationId) {
			invalidateThread(streamEvent.conversationId);
			return;
		}

		if (shownToastMessageIdsRef.current.has(streamEvent.messageId)) {
			return;
		}

		shownToastMessageIdsRef.current.add(streamEvent.messageId);
		window.setTimeout(() => {
			shownToastMessageIdsRef.current.delete(streamEvent.messageId);
		}, 60_000);

		toast.custom(
			(id) => (
				<button
					className="w-full cursor-pointer text-left"
					onClick={() => {
						toast.dismiss(id);
						onOpenConversation(streamEvent.conversationId);
					}}
					type="button"
				>
					<div className="font-medium text-sm">
						{streamEvent.senderName} sent a message
					</div>
					<div className="mt-1 truncate text-muted-foreground text-xs">
						{streamEvent.preview}
					</div>
				</button>
			),
			{ duration: 6000 }
		);
	}
}

export function useChatRealtime({
	conversationId,
	currentUserId,
	streamEvent,
	onOpenConversation,
	updatePresence,
}: UseChatRealtimeOptions): {
	typingNamesByConversationId: Record<string, Record<string, string>>;
} {
	const [typingNamesByConversationId, setTypingNamesByConversationId] =
		useState<Record<string, Record<string, string>>>({});
	const typingExpiryTimersRef = useRef<Map<string, number>>(new Map());
	const lastOnlinePresenceInvalidationAtRef = useRef(0);
	const shownToastMessageIdsRef = useRef(new Set<string>());
	const updatePresenceRef = useRef(updatePresence);
	const lastProcessedEventAtRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		updatePresenceRef.current = updatePresence;
	}, [updatePresence]);

	useEffect(() => {
		if (!streamEvent) {
			return;
		}

		const dedupKey = getEventDedupKey(streamEvent);
		const now = Date.now();
		const lastProcessedAt = lastProcessedEventAtRef.current.get(dedupKey) ?? 0;
		if (now - lastProcessedAt < DUPLICATE_EVENT_WINDOW_MS) {
			return;
		}

		lastProcessedEventAtRef.current.set(dedupKey, now);

		if (streamEvent.type === "chat.typing") {
			handleTypingStreamEvent({
				streamEvent,
				currentUserId,
				typingExpiryTimersRef,
				setTypingNamesByConversationId,
			});
			return;
		}

		handleNonTypingStreamEvent({
			streamEvent,
			conversationId,
			onOpenConversation,
			setTypingNamesByConversationId,
			lastOnlinePresenceInvalidationAtRef,
			shownToastMessageIdsRef,
		});
	}, [conversationId, currentUserId, onOpenConversation, streamEvent]);

	useEffect(() => {
		return () => {
			for (const timer of typingExpiryTimersRef.current.values()) {
				window.clearTimeout(timer);
			}
			typingExpiryTimersRef.current.clear();
		};
	}, []);

	useEffect(() => {
		const setPresence = (status: "online" | "offline") => {
			updatePresenceRef.current({ status });
		};

		const updateOnlinePresence = () => {
			if (document.visibilityState !== "visible") {
				return;
			}

			setPresence("online");
		};

		const handleVisibility = () => {
			if (document.visibilityState === "hidden") {
				setPresence("offline");
				return;
			}

			updateOnlinePresence();
		};

		const handleBeforeUnload = () => {
			setPresence("offline");
		};

		updateOnlinePresence();
		const interval = window.setInterval(updateOnlinePresence, 20_000);
		document.addEventListener("visibilitychange", handleVisibility);
		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", handleVisibility);
			window.removeEventListener("beforeunload", handleBeforeUnload);
			setPresence("offline");
		};
	}, []);

	return {
		typingNamesByConversationId,
	};
}
