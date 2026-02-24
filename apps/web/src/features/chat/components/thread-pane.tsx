import type { ChatGetThreadOutput, ChatMessage } from "@chatroom/validators";
import { Loader2Icon } from "lucide-react";
import type { RefObject } from "react";
import type { DmPresence, ReplyTarget } from "../chat-shell-types";
import { MessageComposer } from "../message-composer";
import { MessageRequestBanner } from "./message-request-banner";
import { MessagesSection } from "./messages-section";
import { ThreadHeader } from "./thread-header";

interface ThreadPaneProps {
	conversationId?: string;
	thread: ChatGetThreadOutput | undefined;
	isLoading: boolean;
	dmPresence: DmPresence;
	dmPeerImage: string | null;
	visibleTypingUserNames: string[];
	onToggleMute: () => void;
	onOpenRenameGroup: () => void;
	onToggleBlock: () => void;
	onAcceptRequest: () => void;
	replyTarget: ReplyTarget | null;
	onCancelReply: () => void;
	onReply: (message: ChatMessage) => void;
	onSendMessage: (input: { text: string; replyToMessageId?: string }) => void;
	onTypingChange: (isTyping: boolean) => void;
	onToggleReaction: (message: ChatMessage, emoji: string) => void;
	onDeleteMessage: (message: ChatMessage, scope: "me" | "everyone") => void;
	messagesBottomRef: RefObject<HTMLDivElement | null>;
	scrollToLatestSignal: number;
}

export function ThreadPane({
	conversationId,
	thread,
	isLoading,
	dmPresence,
	dmPeerImage,
	visibleTypingUserNames,
	onToggleMute,
	onOpenRenameGroup,
	onToggleBlock,
	onAcceptRequest,
	replyTarget,
	onCancelReply,
	onReply,
	onSendMessage,
	onTypingChange,
	onToggleReaction,
	onDeleteMessage,
	messagesBottomRef,
	scrollToLatestSignal,
}: ThreadPaneProps) {
	if (conversationId && isLoading) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
				<Loader2Icon className="mr-2 size-4 animate-spin" />
				Loading conversation...
			</div>
		);
	}

	if (!conversationId) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
				Select a conversation.
			</div>
		);
	}

	if (!thread) {
		return null;
	}

	return (
		<>
			<ThreadHeader
				dmPeerImage={dmPeerImage}
				dmPresence={dmPresence}
				onOpenRenameGroup={onOpenRenameGroup}
				onToggleBlock={onToggleBlock}
				onToggleMute={onToggleMute}
				thread={thread}
				visibleTypingUserNames={visibleTypingUserNames}
			/>

			{thread.conversation.showMessageRequestActions ? (
				<MessageRequestBanner
					onAcceptRequest={onAcceptRequest}
					onToggleBlock={onToggleBlock}
				/>
			) : null}

			<div className="flex min-h-0 flex-1 flex-col">
				<MessagesSection
					messagesBottomRef={messagesBottomRef}
					onDeleteMessage={onDeleteMessage}
					onReply={onReply}
					onToggleReaction={onToggleReaction}
					scrollToLatestSignal={scrollToLatestSignal}
					thread={thread}
				/>

				{thread.conversation.canSend ? (
					<MessageComposer
						onCancelReply={onCancelReply}
						onSend={onSendMessage}
						onTypingChange={onTypingChange}
						replyTo={replyTarget}
					/>
				) : (
					<div className="border-t px-4 py-3 text-muted-foreground text-sm">
						{thread.conversation.blockedState === "blocked_by_me"
							? "You blocked this user. Unblock to send messages."
							: thread.conversation.blockedState === "blocked_by_them"
								? "This conversation is unavailable."
								: "Accept the request before replying."}
					</div>
				)}
			</div>
		</>
	);
}
