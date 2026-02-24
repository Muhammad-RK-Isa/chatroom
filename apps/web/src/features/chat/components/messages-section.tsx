import type { ChatGetThreadOutput, ChatMessage } from "@chatroom/validators";
import { ArrowDownIcon } from "lucide-react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "~/components/ui/button";
import { MessageItem } from "./message-item";

const MESSAGE_HIGHLIGHT_MS = 1200;
const SCROLL_BOTTOM_THRESHOLD_PX = 56;

interface MessagesSectionProps {
	thread: ChatGetThreadOutput;
	messagesBottomRef: RefObject<HTMLDivElement | null>;
	onReply: (message: ChatMessage) => void;
	onToggleReaction: (message: ChatMessage, emoji: string) => void;
	onDeleteMessage: (message: ChatMessage, scope: "me" | "everyone") => void;
	scrollToLatestSignal: number;
}

export function MessagesSection({
	thread,
	messagesBottomRef,
	onReply,
	onToggleReaction,
	onDeleteMessage,
	scrollToLatestSignal,
}: MessagesSectionProps) {
	const [highlightedMessageId, setHighlightedMessageId] = useState<
		string | null
	>(null);
	const [isNearBottom, setIsNearBottom] = useState(true);
	const [unseenIncomingMessagesCount, setUnseenIncomingMessagesCount] =
		useState(0);
	const messagesContainerRef = useRef<HTMLDivElement | null>(null);
	const isNearBottomRef = useRef(true);
	const previousConversationIdRef = useRef<string | null>(null);
	const previousMessageCountRef = useRef(0);
	const previousLastMessageIdRef = useRef<string | null>(null);
	const pendingSentScrollSignalRef = useRef(0);
	const hasInitializedScrollRef = useRef(false);
	const highlightTimeoutRef = useRef<number | null>(null);

	const scrollToBottom = useCallback(
		(behavior: ScrollBehavior = "smooth") => {
			messagesBottomRef.current?.scrollIntoView({ behavior, block: "end" });
		},
		[messagesBottomRef]
	);

	const syncNearBottomState = useCallback(() => {
		const container = messagesContainerRef.current;
		if (!container) {
			return;
		}

		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		const nextIsNearBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD_PX;

		isNearBottomRef.current = nextIsNearBottom;
		setIsNearBottom((current) =>
			current === nextIsNearBottom ? current : nextIsNearBottom
		);

		if (nextIsNearBottom) {
			setUnseenIncomingMessagesCount(0);
		}
	}, []);

	const handleScrollToLatest = useCallback(() => {
		scrollToBottom("smooth");
		window.requestAnimationFrame(() => {
			syncNearBottomState();
		});
	}, [scrollToBottom, syncNearBottomState]);

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				window.clearTimeout(highlightTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const currentConversationId = thread.conversation.id;
		const currentMessageCount = thread.messages.length;
		const currentLastMessage = thread.messages.at(-1) ?? null;
		const currentLastMessageId = currentLastMessage?.id ?? null;
		const previousConversationId = previousConversationIdRef.current;
		const previousMessageCount = previousMessageCountRef.current;
		const previousLastMessageId = previousLastMessageIdRef.current;

		const isConversationChanged =
			previousConversationId !== currentConversationId;

		if (isConversationChanged || !hasInitializedScrollRef.current) {
			hasInitializedScrollRef.current = true;
			previousConversationIdRef.current = currentConversationId;
			previousMessageCountRef.current = currentMessageCount;
			previousLastMessageIdRef.current = currentLastMessageId;
			pendingSentScrollSignalRef.current = 0;
			setUnseenIncomingMessagesCount(0);

			window.requestAnimationFrame(() => {
				scrollToBottom("auto");
				syncNearBottomState();
			});
			return;
		}

		const hasNewMessages = currentMessageCount > previousMessageCount;
		const hasTailMessageChanged =
			previousLastMessageId !== currentLastMessageId;

		if (hasNewMessages && hasTailMessageChanged) {
			const incomingMessagesCount = currentMessageCount - previousMessageCount;
			const shouldScrollToOwnSentMessage =
				pendingSentScrollSignalRef.current > 0 && currentLastMessage?.isOwn;

			if (shouldScrollToOwnSentMessage) {
				pendingSentScrollSignalRef.current = 0;
				window.requestAnimationFrame(() => {
					scrollToBottom("smooth");
					syncNearBottomState();
				});
			} else if (isNearBottomRef.current) {
				window.requestAnimationFrame(() => {
					scrollToBottom("smooth");
					syncNearBottomState();
				});
			} else {
				setUnseenIncomingMessagesCount(
					(currentCount) => currentCount + incomingMessagesCount
				);
			}
		}

		previousConversationIdRef.current = currentConversationId;
		previousMessageCountRef.current = currentMessageCount;
		previousLastMessageIdRef.current = currentLastMessageId;
	}, [
		scrollToBottom,
		syncNearBottomState,
		thread.conversation.id,
		thread.messages,
	]);

	useEffect(() => {
		if (scrollToLatestSignal === 0) {
			return;
		}

		pendingSentScrollSignalRef.current = scrollToLatestSignal;
		window.requestAnimationFrame(() => {
			scrollToBottom("smooth");
			syncNearBottomState();
		});
	}, [scrollToBottom, scrollToLatestSignal, syncNearBottomState]);

	const handleJumpToMessage = useCallback((messageId: string) => {
		const targetElement = document.getElementById(`message-${messageId}`);
		if (!targetElement) {
			return;
		}

		targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
		setHighlightedMessageId(messageId);
		if (highlightTimeoutRef.current) {
			window.clearTimeout(highlightTimeoutRef.current);
		}
		highlightTimeoutRef.current = window.setTimeout(() => {
			setHighlightedMessageId((current) =>
				current === messageId ? null : current
			);
			highlightTimeoutRef.current = null;
		}, MESSAGE_HIGHLIGHT_MS);
	}, []);

	const showScrollToLatestButton =
		unseenIncomingMessagesCount > 0 && !isNearBottom;
	const unreadButtonLabel =
		unseenIncomingMessagesCount > 1
			? `${unseenIncomingMessagesCount} new messages`
			: "New message";

	return (
		<div className="relative min-h-0 flex-1">
			<div
				className="h-full min-h-0 space-y-3 overflow-y-auto px-4 py-4"
				onScroll={syncNearBottomState}
				ref={messagesContainerRef}
			>
				{thread.messages.map((message) => (
					<div id={`message-${message.id}`} key={message.id}>
						<MessageItem
							conversationType={thread.conversation.type}
							highlighted={highlightedMessageId === message.id}
							message={message}
							onDelete={onDeleteMessage}
							onJumpToMessage={handleJumpToMessage}
							onReply={onReply}
							onToggleReaction={onToggleReaction}
						/>
					</div>
				))}

				<div ref={messagesBottomRef} />
			</div>

			{showScrollToLatestButton ? (
				<div className="pointer-events-none absolute right-0 bottom-4 left-0 z-10 flex justify-center px-4">
					<Button
						aria-label={unreadButtonLabel}
						className="pointer-events-auto rounded-full shadow-md"
						onClick={handleScrollToLatest}
						size="sm"
						type="button"
					>
						<ArrowDownIcon className="size-4" />
						<span className="hidden sm:inline">{unreadButtonLabel}</span>
					</Button>
				</div>
			) : null}
		</div>
	);
}
