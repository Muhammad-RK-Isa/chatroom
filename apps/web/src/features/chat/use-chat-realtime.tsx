import { env } from "@chatroom/env/web";
import type {
	ChatSocketClientToServerEvents,
	ChatSocketServerToClientEvents,
	ChatStreamEvent,
} from "@chatroom/validators";
import { type RefObject, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { orpc, queryClient } from "~/lib/orpc";
import { useChatRealtimeStore } from "./chat-realtime-store";

interface UseChatRealtimeOptions {
	conversationId?: string;
	currentUserId?: string;
	onOpenConversation: (conversationId: string) => void;
	updatePresence: (input: { status: "online" | "offline" }) => void;
}

const TYPING_EXPIRE_MS = 3500;
const TYPING_STOP_DELAY_MS = 1000;
const ONLINE_PRESENCE_INVALIDATION_THROTTLE_MS = 30_000;
const DUPLICATE_EVENT_WINDOW_MS = 1500;

function removeTypingUser(conversationId: string, userId: string): void {
	useChatRealtimeStore.getState().removeTypingUser(conversationId, userId);
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

function normalizeStreamEvent(streamEvent: ChatStreamEvent): ChatStreamEvent {
	if (streamEvent.type !== "chat.connected") {
		return streamEvent;
	}

	return {
		...streamEvent,
		at: new Date(streamEvent.at),
	};
}

function handleTypingStreamEvent(options: {
	streamEvent: Extract<ChatStreamEvent, { type: "chat.typing" }>;
	currentUserId: string | undefined;
	typingExpiryTimersRef: RefObject<Map<string, number>>;
}): void {
	const { streamEvent, currentUserId, typingExpiryTimersRef } = options;

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
		useChatRealtimeStore
			.getState()
			.upsertTypingUser(
				streamEvent.conversationId,
				streamEvent.userId,
				streamEvent.userName
			);

		const expiryTimer = window.setTimeout(() => {
			removeTypingUser(streamEvent.conversationId, streamEvent.userId);
			typingExpiryTimersRef.current.delete(typingTimerKey);
		}, TYPING_EXPIRE_MS);

		typingExpiryTimersRef.current.set(typingTimerKey, expiryTimer);
		return;
	}

	const stopTimer = window.setTimeout(() => {
		removeTypingUser(streamEvent.conversationId, streamEvent.userId);
		typingExpiryTimersRef.current.delete(typingTimerKey);
	}, TYPING_STOP_DELAY_MS);

	typingExpiryTimersRef.current.set(typingTimerKey, stopTimer);
}

function handleNonTypingStreamEvent(options: {
	streamEvent: Exclude<ChatStreamEvent, { type: "chat.typing" }>;
	conversationIdRef: RefObject<string | undefined>;
	onOpenConversationRef: RefObject<(conversationId: string) => void>;
	lastOnlinePresenceInvalidationAtRef: RefObject<number>;
	shownToastMessageIdsRef: RefObject<Set<string>>;
}): void {
	const {
		streamEvent,
		conversationIdRef,
		onOpenConversationRef,
		lastOnlinePresenceInvalidationAtRef,
		shownToastMessageIdsRef,
	} = options;

	const activeConversationId = conversationIdRef.current;

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
			if (activeConversationId) {
				invalidateThread(activeConversationId);
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
		removeTypingUser(streamEvent.conversationId, streamEvent.senderUserId);

		if (streamEvent.conversationId === activeConversationId) {
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
						onOpenConversationRef.current(streamEvent.conversationId);
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
	onOpenConversation,
	updatePresence,
}: UseChatRealtimeOptions): {
	typingNamesByConversationId: Record<string, Record<string, string>>;
} {
	const typingNamesByConversationId = useChatRealtimeStore(
		(state) => state.typingNamesByConversationId
	);
	const updatePresenceRef = useRef(updatePresence);
	const conversationIdRef = useRef(conversationId);
	const currentUserIdRef = useRef(currentUserId);
	const onOpenConversationRef = useRef(onOpenConversation);
	const typingExpiryTimersRef = useRef<Map<string, number>>(new Map());
	const lastOnlinePresenceInvalidationAtRef = useRef(0);
	const shownToastMessageIdsRef = useRef(new Set<string>());
	const lastProcessedEventAtRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		updatePresenceRef.current = updatePresence;
	}, [updatePresence]);

	useEffect(() => {
		conversationIdRef.current = conversationId;
	}, [conversationId]);

	useEffect(() => {
		currentUserIdRef.current = currentUserId;
	}, [currentUserId]);

	useEffect(() => {
		onOpenConversationRef.current = onOpenConversation;
	}, [onOpenConversation]);

	useEffect(() => {
		useChatRealtimeStore.getState().setConnectionStatus("connecting");

		const socket: Socket<
			ChatSocketServerToClientEvents,
			ChatSocketClientToServerEvents
		> = io(env.VITE_SERVER_URL, {
			path: "/socket.io/",
			transports: ["websocket", "polling"],
			withCredentials: true,
		});

		const handleConnect = () => {
			useChatRealtimeStore.getState().setConnectionStatus("connected");
		};

		const handleDisconnect = () => {
			useChatRealtimeStore.getState().setConnectionStatus("disconnected");
		};

		const handleStreamEvent = (rawEvent: ChatStreamEvent) => {
			const streamEvent = normalizeStreamEvent(rawEvent);
			const dedupKey = getEventDedupKey(streamEvent);
			const now = Date.now();
			const lastProcessedAt =
				lastProcessedEventAtRef.current.get(dedupKey) ?? 0;
			if (now - lastProcessedAt < DUPLICATE_EVENT_WINDOW_MS) {
				return;
			}

			lastProcessedEventAtRef.current.set(dedupKey, now);

			if (streamEvent.type === "chat.typing") {
				handleTypingStreamEvent({
					streamEvent,
					currentUserId: currentUserIdRef.current,
					typingExpiryTimersRef,
				});
				return;
			}

			handleNonTypingStreamEvent({
				streamEvent,
				conversationIdRef,
				onOpenConversationRef,
				lastOnlinePresenceInvalidationAtRef,
				shownToastMessageIdsRef,
			});
		};

		socket.on("chat:event", handleStreamEvent);
		socket.on("connect", handleConnect);
		socket.on("disconnect", handleDisconnect);

		return () => {
			socket.off("chat:event", handleStreamEvent);
			socket.off("connect", handleConnect);
			socket.off("disconnect", handleDisconnect);
			socket.close();
			useChatRealtimeStore.getState().setConnectionStatus("idle");
			useChatRealtimeStore.getState().clearTypingUsers();
		};
	}, []);

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
