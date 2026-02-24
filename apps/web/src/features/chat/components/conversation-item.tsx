import type { ChatConversationListItem } from "@chatroom/validators";
import { BellOffIcon, ShieldBanIcon, UsersRoundIcon } from "lucide-react";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
} from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { formatConversationTimestamp, getInitials } from "../chat-utils";

interface ConversationItemProps {
	conversation: ChatConversationListItem;
	active: boolean;
	onSelect: () => void;
}

export function ConversationItem({
	conversation,
	active,
	onSelect,
}: ConversationItemProps) {
	const subtitle =
		conversation.dmPeer?.presence.isTyping ||
		(conversation.groupMeta?.typingUserNames.length ?? 0) > 0
			? "Typing..."
			: (conversation.lastMessage?.text ?? "No messages yet");

	return (
		<button
			aria-current={active ? "true" : undefined}
			className={cn(
				"flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted",
				active ? "bg-muted" : ""
			)}
			onClick={onSelect}
			type="button"
		>
			<Avatar className="size-9">
				<AvatarImage
					alt={conversation.dmPeer?.user.username}
					src={conversation.dmPeer?.user.image ?? ""}
				/>
				<AvatarFallback>
					{conversation.type === "group" ? (
						<UsersRoundIcon className="size-4" />
					) : (
						getInitials(conversation.name)
					)}
				</AvatarFallback>
				{conversation.type === "dm" ? (
					<AvatarBadge
						className={cn(
							conversation.dmPeer?.presence.status === "online"
								? "bg-green-600 dark:bg-green-800"
								: "bg-destructive"
						)}
					/>
				) : null}
			</Avatar>

			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-1">
						<span className="truncate font-medium text-sm">
							{conversation.name}
						</span>
						{conversation.muted ? (
							<BellOffIcon className="size-3 text-muted-foreground" />
						) : null}
						{conversation.blockedState !== "none" ? (
							<ShieldBanIcon className="size-3 text-destructive" />
						) : null}
					</div>
					{conversation.lastMessage ? (
						<span className="shrink-0 text-[11px] text-muted-foreground">
							{formatConversationTimestamp(conversation.lastMessage.at)}
						</span>
					) : null}
				</div>
				<div className="mt-0.5 flex items-center justify-between gap-2">
					<p className="truncate text-muted-foreground text-xs">{subtitle}</p>
					{conversation.type === "dm" && conversation.unseenCount > 0 ? (
						<Badge
							className="size-5 rounded-full p-0 text-[10px]"
							variant="secondary"
						>
							{conversation.unseenCount}
						</Badge>
					) : null}
				</div>
			</div>
		</button>
	);
}
