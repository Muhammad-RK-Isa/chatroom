import { useQuery } from "@tanstack/react-query";
import { SearchIcon, UsersRound } from "lucide-react";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { orpc } from "~/lib/orpc";
import { formatLastSeen, getInitials } from "./chat-utils";

interface ChatSearchDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectUser: (userId: string) => void;
	onCreateGroupClick: () => void;
}

export function ChatSearchDialog({
	open,
	onOpenChange,
	onSelectUser,
	onCreateGroupClick,
}: ChatSearchDialogProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery] = useDebounceValue(searchQuery, 250);

	const trimmedQuery = debouncedQuery.trim();
	const isSearchEnabled = open && trimmedQuery.length > 0;

	const usersQuery = useQuery(
		orpc.chat.searchUsers.queryOptions({
			input: { query: trimmedQuery || "_" },
			enabled: isSearchEnabled,
		})
	);

	const handleClose = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			setSearchQuery("");
		}
	};

	return (
		<Dialog onOpenChange={handleClose} open={open}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Find people</DialogTitle>
					<DialogDescription>
						Search by username or email to start a DM.
					</DialogDescription>
				</DialogHeader>

				<div className="relative">
					<SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						autoFocus
						className="pl-9"
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder="Search by username or email"
						value={searchQuery}
					/>
				</div>

				<div className="flex justify-end">
					<Button onClick={onCreateGroupClick} type="button" variant="outline">
						<UsersRound className="size-4" />
						Create group chat
					</Button>
				</div>

				<div className="max-h-80 space-y-1 overflow-y-auto">
					{trimmedQuery.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							Type to search people.
						</div>
					) : null}

					{isSearchEnabled && usersQuery.isLoading ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							Searching...
						</div>
					) : null}

					{isSearchEnabled &&
					!usersQuery.isLoading &&
					usersQuery.data?.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							No users found.
						</div>
					) : null}

					{usersQuery.data?.map((result) => (
						<button
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
							key={result.user.id}
							onClick={() => {
								onSelectUser(result.user.id);
								handleClose(false);
							}}
							type="button"
						>
							<Avatar className="size-9">
								<AvatarFallback>{getInitials(result.user.name)}</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<div className="truncate font-medium text-sm">
									{result.user.name}
								</div>
								<div className="truncate text-muted-foreground text-xs">
									@{result.user.username} - {result.user.email}
								</div>
							</div>
							<div className="text-muted-foreground text-xs">
								{formatLastSeen(
									result.presence.status,
									result.presence.lastSeenAt
								)}
							</div>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
