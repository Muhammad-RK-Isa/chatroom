import type {
	ChatConversationListItem,
	ChatGetThreadOutput,
} from "@chatroom/validators";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
	BellOffIcon,
	LaptopIcon,
	Loader2Icon,
	LogOutIcon,
	MessageCirclePlusIcon,
	MoonIcon,
	MoreHorizontalIcon,
	MoreVerticalIcon,
	SettingsIcon,
	ShieldBanIcon,
	SunIcon,
	UsersRoundIcon,
} from "lucide-react";
import {
	type ChangeEvent,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { AppLogo } from "~/components/icons/app-logo";
import { HalfMoon } from "~/components/icons/half-moon";
import { useTheme } from "~/components/theme-provider";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
} from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { authClient } from "~/lib/auth-client";
import { orpc, queryClient } from "~/lib/orpc";
import { siteConfig } from "~/lib/site.config";
import { cn } from "~/lib/utils";
import { ChatSearchDialog } from "./chat-search-dialog";
import {
	formatConversationTimestamp,
	formatLastSeen,
	formatMessageTime,
	getInitials,
} from "./chat-utils";
import { CreateGroupDialog } from "./create-group-dialog";
import { MessageComposer } from "./message-composer";
import { useChatRealtime } from "./use-chat-realtime";

interface ChatShellProps {
	conversationId?: string;
}

function formatDeliveryStatus(status: "sent" | "delivered" | "seen"): string {
	return `${status[0]?.toUpperCase() ?? ""}${status.slice(1)}`;
}

function ConversationItem({
	conversation,
	active,
	onSelect,
}: {
	conversation: ChatConversationListItem;
	active: boolean;
	onSelect: () => void;
}) {
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
				<AvatarBadge
					className={cn(
						conversation.dmPeer?.presence.status === "online"
							? "bg-green-600 dark:bg-green-800"
							: "bg-destructive"
					)}
				/>
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

function UserMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
	const router = useRouter();
	const currentUser = authClient.useSession().data?.user;
	const { setTheme, themes, theme } = useTheme();

	async function handleSignOut() {
		await authClient.signOut();
		await router.invalidate();
	}

	return (
		<div className="px-2 py-2">
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							className="h-auto w-full justify-start gap-3 rounded-xl px-2 py-1"
							size="lg"
							variant="ghost"
						/>
					}
				>
					<Avatar className="size-8">
						<AvatarImage
							alt={currentUser?.username}
							src={currentUser?.image ?? ""}
						/>
						<AvatarFallback>
							{getInitials(currentUser?.name ?? "User")}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1 text-left">
						<p className="truncate font-medium text-xs">
							{currentUser?.name ?? "Your account"}
						</p>
						<p className="truncate text-muted-foreground text-xs">
							@{currentUser?.username ?? "user"}
						</p>
					</div>
					<MoreHorizontalIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" side="top">
					<div className="px-2 py-1.5">
						<p className="truncate font-medium text-sm">
							{currentUser?.name ?? "Your account"}
						</p>
						<p className="truncate text-muted-foreground text-xs">
							{currentUser?.email ?? ""}
						</p>
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={onOpenSettings}>
						<SettingsIcon className="size-4" />
						Settings
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<HalfMoon />
							Theme
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
								{themes.map((thm) => (
									<DropdownMenuRadioItem
										className="capitalize"
										key={thm}
										value={thm}
									>
										{thm === "light" ? (
											<SunIcon />
										) : thm === "dark" ? (
											<MoonIcon />
										) : (
											<LaptopIcon />
										)}
										{thm}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleSignOut} variant="destructive">
						<LogOutIcon className="size-4" />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function Sidebar({
	conversations,
	conversationId,
	isLoading,
	onSelectConversation,
	onOpenSearch,
	onOpenGroup,
	onOpenSettings,
}: {
	conversations: ChatConversationListItem[];
	conversationId?: string;
	isLoading: boolean;
	onSelectConversation: (id: string) => void;
	onOpenSearch: () => void;
	onOpenGroup: () => void;
	onOpenSettings: () => void;
}) {
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

function ThreadHeader({
	thread,
	dmPresence,
	onToggleMute,
	onOpenRenameGroup,
	onToggleBlock,
}: {
	thread: ChatGetThreadOutput;
	dmPresence: { status: "online" | "offline"; lastSeenAt: Date | null } | null;
	onToggleMute: () => void;
	onOpenRenameGroup: () => void;
	onToggleBlock: () => void;
}) {
	const subtitle =
		thread.conversation.type === "dm"
			? formatLastSeen(
					dmPresence?.status ?? "offline",
					dmPresence?.lastSeenAt ?? null
				)
			: `${thread.conversation.groupMeta?.memberCount ?? 0} members - ${thread.conversation.groupMeta?.onlineCount ?? 0} online`;

	return (
		<header className="border-b bg-card px-4 py-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<Avatar className="size-10">
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

function MessageRequestBanner({
	onAcceptRequest,
	onToggleBlock,
}: {
	onAcceptRequest: () => void;
	onToggleBlock: () => void;
}) {
	return (
		<div className="border-b bg-amber-50 px-4 py-2 dark:bg-amber-950/30">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm">Message request: accept or block this DM.</p>
				<div className="flex gap-2">
					<Button
						onClick={onAcceptRequest}
						size="sm"
						type="button"
						variant="secondary"
					>
						Accept
					</Button>
					<Button
						onClick={onToggleBlock}
						size="sm"
						type="button"
						variant="outline"
					>
						Block
					</Button>
				</div>
			</div>
		</div>
	);
}

function MessagesSection({
	thread,
	visibleTypingUserNames,
	messagesBottomRef,
}: {
	thread: ChatGetThreadOutput;
	visibleTypingUserNames: string[];
	messagesBottomRef: RefObject<HTMLDivElement | null>;
}) {
	return (
		<div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
			{thread.messages.map((message) => (
				<div
					className={cn(
						"flex",
						message.isOwn ? "justify-end" : "justify-start"
					)}
					key={message.id}
				>
					<div
						className={cn(
							"max-w-[75%] rounded-2xl px-3 py-2",
							message.isOwn
								? "rounded-br-md border bg-secondary text-secondary-foreground"
								: "rounded-bl-md bg-muted"
						)}
					>
						{!message.isOwn && thread.conversation.type === "group" ? (
							<p className="mb-1 text-[11px] opacity-80">
								{message.sender.name}
							</p>
						) : null}
						<p className="whitespace-pre-wrap text-sm">{message.text}</p>
						<div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-70">
							<span>{formatMessageTime(message.createdAt)}</span>
							{message.isOwn && message.deliveryStatus ? (
								<span>{formatDeliveryStatus(message.deliveryStatus)}</span>
							) : null}
						</div>
					</div>
				</div>
			))}

			{visibleTypingUserNames.length > 0 ? (
				<div className="text-muted-foreground text-xs">
					{visibleTypingUserNames.join(", ")} typing...
				</div>
			) : null}

			<div ref={messagesBottomRef} />
		</div>
	);
}

function ThreadPane({
	conversationId,
	thread,
	isLoading,
	dmPresence,
	visibleTypingUserNames,
	onToggleMute,
	onOpenRenameGroup,
	onToggleBlock,
	onAcceptRequest,
	onSendMessage,
	onTypingChange,
	sendPending,
	messagesBottomRef,
}: {
	conversationId?: string;
	thread: ChatGetThreadOutput | undefined;
	isLoading: boolean;
	dmPresence: { status: "online" | "offline"; lastSeenAt: Date | null } | null;
	visibleTypingUserNames: string[];
	onToggleMute: () => void;
	onOpenRenameGroup: () => void;
	onToggleBlock: () => void;
	onAcceptRequest: () => void;
	onSendMessage: (text: string) => void;
	onTypingChange: (isTyping: boolean) => void;
	sendPending: boolean;
	messagesBottomRef: RefObject<HTMLDivElement | null>;
}) {
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
				dmPresence={dmPresence}
				onOpenRenameGroup={onOpenRenameGroup}
				onToggleBlock={onToggleBlock}
				onToggleMute={onToggleMute}
				thread={thread}
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
					thread={thread}
					visibleTypingUserNames={visibleTypingUserNames}
				/>

				{thread.conversation.canSend ? (
					<MessageComposer
						disabled={sendPending}
						onSend={onSendMessage}
						onTypingChange={onTypingChange}
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

function RenameGroupDialog({
	open,
	name,
	pending,
	onOpenChange,
	onNameChange,
	onSave,
}: {
	open: boolean;
	name: string;
	pending: boolean;
	onOpenChange: (open: boolean) => void;
	onNameChange: (name: string) => void;
	onSave: () => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit group name</DialogTitle>
				</DialogHeader>
				<Input
					onChange={(event: ChangeEvent<HTMLInputElement>) =>
						onNameChange(event.target.value)
					}
					placeholder="Group name"
					value={name}
				/>
				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="ghost"
					>
						Cancel
					</Button>
					<Button disabled={pending} onClick={onSave} type="button">
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ChatShell({ conversationId }: ChatShellProps) {
	const navigate = useNavigate();
	const messagesBottomRef = useRef<HTMLDivElement | null>(null);
	const typingStateRef = useRef(false);
	const previousConversationIdRef = useRef<string | null>(null);
	const lastSeenSyncKeyRef = useRef<string>("");

	const [searchDialogOpen, setSearchDialogOpen] = useState(false);
	const [groupDialogOpen, setGroupDialogOpen] = useState(false);
	const [renameGroupDialogOpen, setRenameGroupDialogOpen] = useState(false);
	const [nextGroupName, setNextGroupName] = useState("");

	const authSession = authClient.useSession();

	const conversationsQuery = useQuery(
		orpc.chat.listConversations.queryOptions()
	);
	const selectedConversation = useMemo(
		() =>
			conversationsQuery.data?.find(
				(conversation) => conversation.id === conversationId
			) ?? null,
		[conversationId, conversationsQuery.data]
	);

	const threadQuery = useQuery(
		orpc.chat.getThread.queryOptions({
			input: { conversationId: conversationId ?? "" },
			enabled: Boolean(conversationId),
		})
	);

	const streamQuery = useQuery(
		orpc.chat.stream.experimental_liveOptions({
			retry: true,
			staleTime: Number.POSITIVE_INFINITY,
		})
	);

	const openDmMutation = useMutation(orpc.chat.openDm.mutationOptions());
	const createGroupMutation = useMutation(
		orpc.chat.createGroup.mutationOptions()
	);
	const renameGroupMutation = useMutation(
		orpc.chat.renameGroup.mutationOptions()
	);
	const sendMessageMutation = useMutation(
		orpc.chat.sendMessage.mutationOptions()
	);
	const { mutate: markConversationSeen } = useMutation(
		orpc.chat.markConversationSeen.mutationOptions()
	);
	const { mutate: setTyping } = useMutation(
		orpc.chat.setTyping.mutationOptions()
	);
	const setMuteMutation = useMutation(
		orpc.chat.setConversationMute.mutationOptions()
	);
	const blockUserMutation = useMutation(orpc.chat.blockUser.mutationOptions());
	const unblockUserMutation = useMutation(
		orpc.chat.unblockUser.mutationOptions()
	);
	const acceptRequestMutation = useMutation(
		orpc.chat.acceptMessageRequest.mutationOptions()
	);
	const updatePresenceMutation = useMutation(
		orpc.chat.updatePresence.mutationOptions()
	);

	const handleOpenConversation = useCallback(
		(id: string) => {
			navigate({ to: "/chats/$id", params: { id } });
		},
		[navigate]
	);

	const { typingNamesByConversationId } = useChatRealtime({
		conversationId,
		currentUserId: authSession.data?.user.id,
		streamEvent: streamQuery.data,
		onOpenConversation: handleOpenConversation,
		updatePresence: updatePresenceMutation.mutate,
	});

	useEffect(() => {
		if (!(conversationId && threadQuery.data)) {
			lastSeenSyncKeyRef.current = "";
			return;
		}

		const latestIncomingMessage = [...threadQuery.data.messages]
			.reverse()
			.find((message) => !message.isOwn);

		const syncKey = `${conversationId}:${latestIncomingMessage?.id ?? "none"}`;

		if (lastSeenSyncKeyRef.current === syncKey) {
			return;
		}

		lastSeenSyncKeyRef.current = syncKey;

		if (latestIncomingMessage) {
			markConversationSeen({ conversationId });
		}
	}, [conversationId, markConversationSeen, threadQuery.data]);

	useEffect(() => {
		if (threadQuery.data?.messages) {
			messagesBottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [threadQuery.data?.messages]);

	useEffect(() => {
		const previousConversationId = previousConversationIdRef.current;

		if (previousConversationId && typingStateRef.current) {
			setTyping({ conversationId: previousConversationId, isTyping: false });
		}

		typingStateRef.current = false;
		previousConversationIdRef.current = conversationId ?? null;
	}, [conversationId, setTyping]);

	const invalidateChatViews = (targetConversationId?: string) => {
		queryClient.invalidateQueries({
			queryKey: orpc.chat.listConversations.queryKey(),
		});

		if (!targetConversationId) {
			return;
		}

		queryClient.invalidateQueries({
			queryKey: orpc.chat.getThread.queryKey({
				input: { conversationId: targetConversationId },
			}),
		});
	};

	const handleTypingChange = (isTyping: boolean) => {
		if (!conversationId || typingStateRef.current === isTyping) {
			return;
		}

		typingStateRef.current = isTyping;
		setTyping({ conversationId, isTyping });
	};

	const handleSendMessage = (text: string) => {
		if (!conversationId) {
			return;
		}

		sendMessageMutation.mutate(
			{ conversationId, text },
			{
				onSuccess: () => {
					typingStateRef.current = false;
					setTyping({ conversationId, isTyping: false });
					invalidateChatViews(conversationId);
				},
			}
		);
	};

	const handleSearchSelectUser = async (userId: string) => {
		const result = await openDmMutation.mutateAsync({ targetUserId: userId });
		handleOpenConversation(result.conversationId);
	};

	const handleCreateGroup = async (payload: {
		name: string;
		memberUserIds: string[];
	}) => {
		const result = await createGroupMutation.mutateAsync(payload);
		handleOpenConversation(result.conversationId);
	};

	const thread = threadQuery.data;
	const currentUser = authSession.data?.user ?? null;

	const dmPeerParticipant =
		thread?.conversation.type === "dm" && currentUser?.id
			? thread.conversation.participants.find(
					(participant) => participant.user.id !== currentUser?.id
				)
			: undefined;

	const dmPeerPresence =
		dmPeerParticipant?.presence ??
		selectedConversation?.dmPeer?.presence ??
		null;

	const liveTypingNames = conversationId
		? Object.values(typingNamesByConversationId[conversationId] ?? {})
		: [];

	const visibleTypingUserNames = thread
		? [...new Set([...thread.typingUserNames, ...liveTypingNames])]
		: [];

	const handleOpenRenameGroup = () => {
		if (thread?.conversation.type !== "group") {
			return;
		}

		setNextGroupName(thread.conversation.name);
		setRenameGroupDialogOpen(true);
	};

	const handleRenameGroup = () => {
		if (!conversationId) {
			return;
		}

		const trimmedName = nextGroupName.trim();
		if (trimmedName.length < 2) {
			toast.error("Group name must be at least 2 characters");
			return;
		}

		renameGroupMutation.mutate(
			{ conversationId, name: trimmedName },
			{
				onError: () => {
					toast.error("Could not rename group");
				},
				onSuccess: () => {
					setRenameGroupDialogOpen(false);
					invalidateChatViews(conversationId);
				},
			}
		);
	};

	const handleToggleMute = () => {
		if (!(conversationId && thread)) {
			return;
		}

		setMuteMutation.mutate(
			{ conversationId, muted: !thread.conversation.muted },
			{
				onError: () => {
					toast.error("Could not update mute setting");
				},
				onSuccess: () => {
					invalidateChatViews(conversationId);
				},
			}
		);
	};

	const handleToggleBlock = () => {
		const targetUserId =
			thread?.conversation.type === "dm" && currentUser?.id
				? thread.conversation.participants.find(
						(participant) => participant.user.id !== currentUser.id
					)?.user.id
				: selectedConversation?.dmPeer?.user.id;

		if (!targetUserId) {
			return;
		}

		if (thread?.conversation.blockedState === "blocked_by_me") {
			unblockUserMutation.mutate(
				{ targetUserId },
				{
					onError: () => {
						toast.error("Could not unblock user");
					},
					onSuccess: () => {
						invalidateChatViews(conversationId);
					},
				}
			);
			return;
		}

		blockUserMutation.mutate(
			{ targetUserId },
			{
				onError: () => {
					toast.error("Could not block user");
				},
				onSuccess: () => {
					invalidateChatViews(conversationId);
				},
			}
		);
	};

	const handleAcceptRequest = () => {
		if (!conversationId) {
			return;
		}

		acceptRequestMutation.mutate(
			{ conversationId },
			{
				onError: () => {
					toast.error("Could not accept request");
				},
				onSuccess: () => {
					invalidateChatViews(conversationId);
				},
			}
		);
	};

	const handleOpenSettings = () => {
		navigate({ to: "/settings" });
	};

	return (
		<>
			<div className="grid h-full min-h-0 md:grid-cols-[320px_1fr]">
				<Sidebar
					conversationId={conversationId}
					conversations={conversationsQuery.data ?? []}
					isLoading={conversationsQuery.isLoading}
					onOpenGroup={() => setGroupDialogOpen(true)}
					onOpenSearch={() => setSearchDialogOpen(true)}
					onOpenSettings={handleOpenSettings}
					onSelectConversation={handleOpenConversation}
				/>

				<section className="flex min-h-0 flex-col">
					<ThreadPane
						conversationId={conversationId}
						dmPresence={dmPeerPresence}
						isLoading={threadQuery.isLoading}
						messagesBottomRef={messagesBottomRef}
						onAcceptRequest={handleAcceptRequest}
						onOpenRenameGroup={handleOpenRenameGroup}
						onSendMessage={handleSendMessage}
						onToggleBlock={handleToggleBlock}
						onToggleMute={handleToggleMute}
						onTypingChange={handleTypingChange}
						sendPending={sendMessageMutation.isPending}
						thread={thread}
						visibleTypingUserNames={visibleTypingUserNames}
					/>
				</section>
			</div>

			<RenameGroupDialog
				name={nextGroupName}
				onNameChange={setNextGroupName}
				onOpenChange={setRenameGroupDialogOpen}
				onSave={handleRenameGroup}
				open={renameGroupDialogOpen}
				pending={renameGroupMutation.isPending}
			/>

			<ChatSearchDialog
				onCreateGroupClick={() => {
					setSearchDialogOpen(false);
					setGroupDialogOpen(true);
				}}
				onOpenChange={setSearchDialogOpen}
				onSelectUser={handleSearchSelectUser}
				open={searchDialogOpen}
			/>

			<CreateGroupDialog
				onCreateGroup={handleCreateGroup}
				onOpenChange={setGroupDialogOpen}
				open={groupDialogOpen}
			/>
		</>
	);
}
