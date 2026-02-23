import { useQuery } from "@tanstack/react-query";
import { CheckIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { orpc } from "~/lib/orpc";
import { getInitials } from "./chat-utils";

interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateGroup: (payload: { name: string; memberUserIds: string[] }) => void;
}

export function CreateGroupDialog({
	open,
	onOpenChange,
	onCreateGroup,
}: CreateGroupDialogProps) {
	const [groupName, setGroupName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const [debouncedQuery] = useDebounceValue(searchQuery, 250);

	const trimmedQuery = debouncedQuery.trim();
	const usersQuery = useQuery(
		orpc.chat.searchUsers.queryOptions({
			input: { query: trimmedQuery || "_" },
			enabled: open && trimmedQuery.length > 0,
		})
	);

	const closeDialog = (nextOpen: boolean) => {
		onOpenChange(nextOpen);

		if (!nextOpen) {
			setGroupName("");
			setSearchQuery("");
			setSelectedUserIds([]);
		}
	};

	const toggleSelection = (userId: string) => {
		setSelectedUserIds((currentIds) => {
			if (currentIds.includes(userId)) {
				return currentIds.filter((id) => id !== userId);
			}

			return [...currentIds, userId];
		});
	};

	const handleCreate = () => {
		onCreateGroup({
			name: groupName.trim(),
			memberUserIds: selectedUserIds,
		});
		closeDialog(false);
	};

	const canCreate = groupName.trim().length > 1 && selectedUserIds.length > 0;

	return (
		<Dialog onOpenChange={closeDialog} open={open}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Create group chat</DialogTitle>
					<DialogDescription>
						Set a group name and choose members.
					</DialogDescription>
				</DialogHeader>

				<Input
					onChange={(event) => setGroupName(event.target.value)}
					placeholder="Group name"
					value={groupName}
				/>

				<div className="relative">
					<SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="pl-9"
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder="Search people"
						value={searchQuery}
					/>
				</div>

				<div className="max-h-64 space-y-1 overflow-y-auto">
					{usersQuery.data?.map((result) => {
						const isSelected = selectedUserIds.includes(result.user.id);

						return (
							<button
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
								key={result.user.id}
								onClick={() => toggleSelection(result.user.id)}
								type="button"
							>
								<Avatar className="size-9">
									<AvatarFallback>
										{getInitials(result.user.name)}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium text-sm">
										{result.user.name}
									</div>
									<div className="truncate text-muted-foreground text-xs">
										@{result.user.username}
									</div>
								</div>
								{isSelected ? (
									<CheckIcon className="size-4 text-primary" />
								) : null}
							</button>
						);
					})}
				</div>

				<DialogFooter>
					<Button
						onClick={() => closeDialog(false)}
						type="button"
						variant="ghost"
					>
						Cancel
					</Button>
					<Button disabled={!canCreate} onClick={handleCreate} type="button">
						Create group
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
