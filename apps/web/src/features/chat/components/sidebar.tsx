import type { ChatConversationListItem } from "@chatroom/validators";
import {
	Loader2Icon,
	MessageCirclePlusIcon,
	UsersRoundIcon,
} from "lucide-react";
import { AppLogo } from "~/components/icons/app-logo";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { siteConfig } from "~/lib/site.config";
import { ConversationItem } from "./conversation-item";
import { UserMenu } from "./user-menu";

interface SidebarProps {
	conversations: ChatConversationListItem[];
	conversationId?: string;
	isLoading: boolean;
	onSelectConversation: (id: string) => void;
	onOpenSearch: () => void;
	onOpenGroup: () => void;
	onOpenSettings: () => void;
}

export function Sidebar({
	conversations,
	conversationId,
	isLoading,
	onSelectConversation,
	onOpenSearch,
	onOpenGroup,
	onOpenSettings,
}: SidebarProps) {
	const dms = conversations.filter(
		(conversation) => conversation.type === "dm"
	);
	const groups = conversations.filter(
		(conversation) => conversation.type === "group"
	);

	return (
		<aside className="flex min-h-0 flex-col border-sidebar-border border-r bg-sidebar">
			<div className="flex items-center justify-between border-b px-3 py-3">
				<div className="flex items-center gap-2.5">
					<div className="inline-flex size-8 items-center justify-center rounded-lg border bg-muted text-foreground">
						<AppLogo className="size-5 stroke-primary" />
					</div>
					<div>
						<p className="font-mono font-semibold text-lg">{siteConfig.name}</p>
					</div>
				</div>
				<div className="flex gap-1 py-0.5">
					<Tooltip>
						<TooltipTrigger
							delay={1000}
							render={
								<Button onClick={onOpenSearch} size="icon" variant="ghost">
									<MessageCirclePlusIcon />
								</Button>
							}
						/>
						<TooltipContent side="left">
							<p>Add new people to chat</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							delay={1000}
							render={
								<Button onClick={onOpenGroup} size="icon" variant="ghost">
									<UsersRoundIcon />
									<span className="sr-only">Create group</span>
								</Button>
							}
						/>
						<TooltipContent side="right">
							<p>Create new group</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-2">
				{isLoading ? (
					<div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
						<Loader2Icon className="mr-2 size-4 animate-spin" />
						Loading chats...
					</div>
				) : null}

				{dms.length > 0 ? (
					<div>
						<div className="px-2 pb-2 font-semibold text-[11px] text-muted-foreground tracking-wider">
							DMs
						</div>
						{dms.map((conversation) => (
							<ConversationItem
								active={conversation.id === conversationId}
								conversation={conversation}
								key={conversation.id}
								onSelect={() => onSelectConversation(conversation.id)}
							/>
						))}
					</div>
				) : null}

				{groups.length > 0 ? (
					<div className="mt-3">
						<div className="px-2 pb-2 font-semibold text-[11px] text-muted-foreground tracking-wider">
							Groups
						</div>
						{groups.map((conversation) => (
							<ConversationItem
								active={conversation.id === conversationId}
								conversation={conversation}
								key={conversation.id}
								onSelect={() => onSelectConversation(conversation.id)}
							/>
						))}
					</div>
				) : null}

				{!isLoading && dms.length === 0 && groups.length === 0 ? (
					<div className="py-10 text-center text-muted-foreground text-sm">
						No conversations yet.
					</div>
				) : null}
			</div>

			<Separator />
			<UserMenu onOpenSettings={onOpenSettings} />
		</aside>
	);
}
