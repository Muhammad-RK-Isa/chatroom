import type { ChatGetThreadOutput } from "@chatroom/validators";
import { MoreVerticalIcon, UsersRoundIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { DmPresence } from "../chat-shell-types";
import { formatLastSeen, getInitials } from "../chat-utils";

interface ThreadHeaderProps {
	thread: ChatGetThreadOutput;
	dmPresence: DmPresence;
	dmPeerImage: string | null;
	visibleTypingUserNames: string[];
	onToggleMute: () => void;
	onOpenRenameGroup: () => void;
	onToggleBlock: () => void;
}

export function ThreadHeader({
	thread,
	dmPresence,
	dmPeerImage,
	visibleTypingUserNames,
	onToggleMute,
	onOpenRenameGroup,
	onToggleBlock,
}: ThreadHeaderProps) {
	const defaultSubtitle =
		thread.conversation.type === "dm"
			? formatLastSeen(
					dmPresence?.status ?? "offline",
					dmPresence?.lastSeenAt ?? null
				)
			: `${thread.conversation.groupMeta?.memberCount ?? 0} members - ${thread.conversation.groupMeta?.onlineCount ?? 0} online`;
	const typingSubtitle =
		visibleTypingUserNames.length === 0
			? null
			: thread.conversation.type === "dm"
				? "Typing..."
				: `${visibleTypingUserNames.join(", ")} typing...`;
	const subtitle = typingSubtitle ?? defaultSubtitle;

	return (
		<header className="border-b bg-card px-4 py-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<Avatar className="size-10">
						{thread.conversation.type === "dm" ? (
							<AvatarImage
								alt={thread.conversation.name}
								src={dmPeerImage ?? ""}
							/>
						) : null}
						<AvatarFallback>
							{thread.conversation.type === "group" ? (
								<UsersRoundIcon className="size-4" />
							) : (
								getInitials(thread.conversation.name)
							)}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<p className="truncate font-semibold text-sm">
							{thread.conversation.name}
						</p>
						<p className="truncate text-muted-foreground text-xs">{subtitle}</p>
					</div>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label="Conversation options"
						className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
						type="button"
					>
						<MoreVerticalIcon className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onToggleMute}>
							{thread.conversation.muted ? "Unmute" : "Mute"}
						</DropdownMenuItem>
						{thread.conversation.type === "group" ? (
							<DropdownMenuItem onClick={onOpenRenameGroup}>
								Edit group name
							</DropdownMenuItem>
						) : null}
						{thread.conversation.type === "dm" ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={onToggleBlock} variant="destructive">
									{thread.conversation.blockedState === "blocked_by_me"
										? "Unblock"
										: "Block"}
								</DropdownMenuItem>
							</>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
