import type { ChangeEvent } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

interface RenameGroupDialogProps {
	open: boolean;
	name: string;
	pending: boolean;
	onOpenChange: (open: boolean) => void;
	onNameChange: (name: string) => void;
	onSave: () => void;
}

export function RenameGroupDialog({
	open,
	name,
	pending,
	onOpenChange,
	onNameChange,
	onSave,
}: RenameGroupDialogProps) {
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
