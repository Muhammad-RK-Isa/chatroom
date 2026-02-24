import type { ChatMessage } from "@chatroom/validators";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import { orpc, queryClient } from "~/lib/orpc";
import { ChatSearchDialog } from "./chat-search-dialog";
import type { ReplyTarget } from "./chat-shell-types";
import { BlockToggleAlertDialog } from "./components/block-toggle-alert-dialog";
import { RenameGroupDialog } from "./components/rename-group-dialog";
import { SettingsModal } from "./components/settings-modal";
import { Sidebar } from "./components/sidebar";
import { ThreadPane } from "./components/thread-pane";
import { CreateGroupDialog } from "./create-group-dialog";
import { useChatRealtime } from "./use-chat-realtime";

interface ChatShellProps {
	conversationId?: string;
	isSettingsModalOpen: boolean;
	onOpenSettings: () => void;
	onSettingsModalOpenChange: (open: boolean) => void;
}

export function ChatShell({
	conversationId,
	isSettingsModalOpen,
	onOpenSettings,
	onSettingsModalOpenChange,
}: ChatShellProps) {
	const navigate = useNavigate();
	const messagesBottomRef = useRef<HTMLDivElement | null>(null);
	const typingStateRef = useRef(false);
	const previousConversationIdRef = useRef<string | null>(null);
	const lastSeenSyncKeyRef = useRef<string>("");

	const [searchDialogOpen, setSearchDialogOpen] = useState(false);
	const [groupDialogOpen, setGroupDialogOpen] = useState(false);
	const [renameGroupDialogOpen, setRenameGroupDialogOpen] = useState(false);
	const [nextGroupName, setNextGroupName] = useState("");
	const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
	const [scrollToLatestSignal, setScrollToLatestSignal] = useState(0);
	const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

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
	const setMessageReactionMutation = useMutation(
		orpc.chat.setMessageReaction.mutationOptions()
	);
	const clearMessageReactionMutation = useMutation(
		orpc.chat.clearMessageReaction.mutationOptions()
	);
	const deleteMessageMutation = useMutation(
		orpc.chat.deleteMessage.mutationOptions()
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
		const previousConversationId = previousConversationIdRef.current;

		if (previousConversationId && typingStateRef.current) {
			setTyping({ conversationId: previousConversationId, isTyping: false });
		}

		typingStateRef.current = false;
		previousConversationIdRef.current = conversationId ?? null;
		setReplyTarget(null);
		setBlockConfirmOpen(false);
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

	const handleSendMessage = (input: {
		text: string;
		replyToMessageId?: string;
	}) => {
		if (!conversationId) {
			return;
		}

		sendMessageMutation.mutate(
			{
				conversationId,
				text: input.text,
				replyToMessageId: input.replyToMessageId,
			},
			{
				onSuccess: () => {
					typingStateRef.current = false;
					setTyping({ conversationId, isTyping: false });
					setReplyTarget(null);
					setScrollToLatestSignal((currentSignal) => currentSignal + 1);
					invalidateChatViews(conversationId);
				},
			}
		);
	};

	const handleReply = (message: ChatMessage) => {
		setReplyTarget({
			id: message.id,
			senderName: message.sender.name,
			text: message.text,
		});
	};

	const handleToggleReaction = (message: ChatMessage, emoji: string) => {
		if (message.myReaction === emoji) {
			clearMessageReactionMutation.mutate(
				{ messageId: message.id },
				{
					onError: () => {
						toast.error("Could not clear reaction");
					},
					onSuccess: () => {
						invalidateChatViews(conversationId);
					},
				}
			);
			return;
		}

		setMessageReactionMutation.mutate(
			{ messageId: message.id, emoji },
			{
				onError: () => {
					toast.error("Could not react to message");
				},
				onSuccess: () => {
					invalidateChatViews(conversationId);
				},
			}
		);
	};

	const handleDeleteMessage = (
		message: ChatMessage,
		scope: "me" | "everyone"
	) => {
		deleteMessageMutation.mutate(
			{ messageId: message.id, scope },
			{
				onError: () => {
					toast.error("Could not delete message");
				},
				onSuccess: () => {
					if (replyTarget?.id === message.id) {
						setReplyTarget(null);
					}
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

	const dmPeerImage =
		dmPeerParticipant?.user.image ??
		selectedConversation?.dmPeer?.user.image ??
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

	const targetBlockUserId =
		thread?.conversation.type === "dm" && currentUser?.id
			? thread.conversation.participants.find(
					(participant) => participant.user.id !== currentUser.id
				)?.user.id
			: selectedConversation?.dmPeer?.user.id;

	const isBlockedByMe = thread?.conversation.blockedState === "blocked_by_me";

	const handleToggleBlock = () => {
		if (!targetBlockUserId) {
			return;
		}

		setBlockConfirmOpen(true);
	};

	const handleConfirmToggleBlock = () => {
		if (!targetBlockUserId) {
			setBlockConfirmOpen(false);
			return;
		}

		if (isBlockedByMe) {
			unblockUserMutation.mutate(
				{ targetUserId: targetBlockUserId },
				{
					onError: () => {
						toast.error("Could not unblock user");
					},
					onSuccess: () => {
						setBlockConfirmOpen(false);
						invalidateChatViews(conversationId);
					},
				}
			);
			return;
		}

		blockUserMutation.mutate(
			{ targetUserId: targetBlockUserId },
			{
				onError: () => {
					toast.error("Could not block user");
				},
				onSuccess: () => {
					setBlockConfirmOpen(false);
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

	return (
		<>
			<div className="grid h-full min-h-0 md:grid-cols-[320px_1fr]">
				<Sidebar
					conversationId={conversationId}
					conversations={conversationsQuery.data ?? []}
					isLoading={conversationsQuery.isLoading}
					onOpenGroup={() => setGroupDialogOpen(true)}
					onOpenSearch={() => setSearchDialogOpen(true)}
					onOpenSettings={onOpenSettings}
					onSelectConversation={handleOpenConversation}
				/>

				<section className="flex min-h-0 flex-col">
					<ThreadPane
						conversationId={conversationId}
						dmPeerImage={dmPeerImage}
						dmPresence={dmPeerPresence}
						isLoading={threadQuery.isLoading}
						messagesBottomRef={messagesBottomRef}
						onAcceptRequest={handleAcceptRequest}
						onCancelReply={() => setReplyTarget(null)}
						onDeleteMessage={handleDeleteMessage}
						onOpenRenameGroup={handleOpenRenameGroup}
						onReply={handleReply}
						onSendMessage={handleSendMessage}
						onToggleBlock={handleToggleBlock}
						onToggleMute={handleToggleMute}
						onToggleReaction={handleToggleReaction}
						onTypingChange={handleTypingChange}
						replyTarget={replyTarget}
						scrollToLatestSignal={scrollToLatestSignal}
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

			<BlockToggleAlertDialog
				isBlockedByMe={isBlockedByMe}
				onConfirm={handleConfirmToggleBlock}
				onOpenChange={setBlockConfirmOpen}
				open={blockConfirmOpen}
				pending={blockUserMutation.isPending || unblockUserMutation.isPending}
			/>

			<SettingsModal
				onOpenChange={onSettingsModalOpenChange}
				open={isSettingsModalOpen}
			/>
		</>
	);
}
