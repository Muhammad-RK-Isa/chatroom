import type { ChatMessage } from "@chatroom/validators";
import { CopyIcon, PlusIcon, ReplyIcon, Trash2Icon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "~/components/ui/emoji-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { formatMessageTime } from "../chat-utils";

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢"] as const;
const TOUCH_DOUBLE_TAP_WINDOW_MS = 280;

function formatDeliveryStatus(status: "sent" | "delivered" | "seen"): string {
	return `${status[0]?.toUpperCase() ?? ""}${status.slice(1)}`;
}

interface MessageItemProps {
	conversationType: "dm" | "group";
	message: ChatMessage;
	highlighted: boolean;
	onJumpToMessage: (messageId: string) => void;
	onReply: (message: ChatMessage) => void;
	onToggleReaction: (message: ChatMessage, emoji: string) => void;
	onDelete: (message: ChatMessage, scope: "me" | "everyone") => void;
}

export function MessageItem({
	conversationType,
	message,
	highlighted,
	onJumpToMessage,
	onReply,
	onToggleReaction,
	onDelete,
}: MessageItemProps) {
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [isContextReactionPickerOpen, setIsContextReactionPickerOpen] =
		useState(false);
	const lastTouchTapAtRef = useRef(0);

	const closeMessageContextMenu = useCallback(() => {
		setIsContextReactionPickerOpen(false);
		setIsContextMenuOpen(false);
	}, []);

	const handleContextMenuOpenChange = useCallback((open: boolean) => {
		setIsContextMenuOpen(open);
		if (!open) {
			setIsContextReactionPickerOpen(false);
		}
	}, []);

	const handleCopyMessage = useCallback(() => {
		closeMessageContextMenu();

		if (!navigator.clipboard?.writeText) {
			toast.error("Clipboard is not available");
			return;
		}

		navigator.clipboard
			.writeText(message.text)
			.then(() => {
				toast.success("Message copied");
			})
			.catch(() => {
				toast.error("Could not copy message");
			});
	}, [closeMessageContextMenu, message.text]);

	const reactionEntries = message.reactions
		.slice()
		.sort((left, right) => right.count - left.count);
	const replyToMessage = message.replyTo;

	return (
		<div
			className={cn(
				"group/message flex",
				message.isOwn ? "justify-end" : "justify-start"
			)}
		>
			<ContextMenu
				onOpenChange={handleContextMenuOpenChange}
				open={isContextMenuOpen}
			>
				<ContextMenuTrigger>
					<div className={cn("relative max-w-sm lg:max-w-lg")}>
						<button
							aria-label="Message actions"
							className="block w-full text-left"
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onReply(message);
								}
							}}
							onPointerUp={(event) => {
								if (event.pointerType !== "touch") {
									return;
								}

								const now = Date.now();
								if (
									now - lastTouchTapAtRef.current <=
									TOUCH_DOUBLE_TAP_WINDOW_MS
								) {
									onToggleReaction(message, QUICK_REACTIONS[0]);
									lastTouchTapAtRef.current = 0;
									return;
								}

								lastTouchTapAtRef.current = now;
							}}
							type="button"
						>
							<div
								className={cn(
									"rounded-2xl px-3 py-2 transition-colors",
									highlighted ? "ring-2 ring-primary/40" : "",
									message.isOwn
										? "rounded-br-md border bg-secondary text-secondary-foreground"
										: "rounded-bl-md bg-muted"
								)}
							>
								{!message.isOwn && conversationType === "group" ? (
									<p className="mb-1 text-[11px] opacity-80">
										{message.sender.name}
									</p>
								) : null}
								{replyToMessage ? (
									<button
										className="mb-1.5 block w-full rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-left hover:bg-background/80"
										onClick={(event) => {
											event.stopPropagation();
											onJumpToMessage(replyToMessage.id);
										}}
										type="button"
									>
										<p className="font-medium text-[10px] text-muted-foreground">
											{replyToMessage.senderName}
										</p>
										<p className="truncate text-[11px]">
											{replyToMessage.text}
										</p>
									</button>
								) : null}
								<p className="wrap-break-word whitespace-pre-wrap text-sm">
									{message.text}
								</p>
								<div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-70">
									<span>{formatMessageTime(message.createdAt)}</span>
									{message.isOwn && message.deliveryStatus ? (
										<span>{formatDeliveryStatus(message.deliveryStatus)}</span>
									) : null}
								</div>
							</div>
						</button>

						{reactionEntries.length > 0 ? (
							<div
								className={cn(
									"mt-1 flex flex-wrap gap-1",
									message.isOwn ? "justify-end" : "justify-start"
								)}
							>
								{reactionEntries.map((reaction) => (
									<button
										className={cn(
											"rounded-full border px-2 py-0.5 text-xs",
											message.myReaction === reaction.emoji
												? "border-primary bg-primary/10"
												: "bg-background"
										)}
										key={reaction.emoji}
										onClick={() => onToggleReaction(message, reaction.emoji)}
										type="button"
									>
										{reaction.emoji} {reaction.count}
									</button>
								))}
							</div>
						) : null}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className="w-52">
					<div className="flex items-center gap-1 px-2 py-1">
						{QUICK_REACTIONS.map((emoji) => (
							<button
								className="rounded-full px-1.5 py-1 text-sm hover:bg-muted"
								key={emoji}
								onClick={() => {
									closeMessageContextMenu();
									onToggleReaction(message, emoji);
								}}
								type="button"
							>
								{emoji}
							</button>
						))}
						<Popover
							onOpenChange={setIsContextReactionPickerOpen}
							open={isContextReactionPickerOpen}
						>
							<PopoverTrigger
								render={
									<Button
										className="size-6 rounded-full"
										size="icon"
										variant="ghost"
									>
										<PlusIcon className="size-3.5" />
									</Button>
								}
							/>
							<PopoverContent align="start" className="w-fit p-0" side="top">
								<EmojiPicker
									className="h-60"
									onEmojiSelect={({ emoji }) => {
										closeMessageContextMenu();
										onToggleReaction(message, emoji);
									}}
									onKeyDown={(event) => event.stopPropagation()}
								>
									<EmojiPickerSearch />
									<EmojiPickerContent />
									<EmojiPickerFooter />
								</EmojiPicker>
							</PopoverContent>
						</Popover>
					</div>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => {
							closeMessageContextMenu();
							onReply(message);
						}}
					>
						<ReplyIcon className="size-4" />
						Reply
					</ContextMenuItem>
					<ContextMenuItem onClick={handleCopyMessage}>
						<CopyIcon className="size-4" />
						Copy message
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => {
							closeMessageContextMenu();
							onDelete(message, "me");
						}}
					>
						<Trash2Icon className="size-4" />
						Delete for me
					</ContextMenuItem>
					{message.isOwn ? (
						<ContextMenuItem
							onClick={() => {
								closeMessageContextMenu();
								onDelete(message, "everyone");
							}}
							variant="destructive"
						>
							<Trash2Icon className="size-4" />
							Delete for everyone
						</ContextMenuItem>
					) : null}
				</ContextMenuContent>
			</ContextMenu>
		</div>
	);
}
