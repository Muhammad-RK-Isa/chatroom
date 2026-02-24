import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface BlockToggleAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isBlockedByMe: boolean;
	onConfirm: () => void;
	pending?: boolean;
}

export function BlockToggleAlertDialog({
	open,
	onOpenChange,
	isBlockedByMe,
	onConfirm,
	pending = false,
}: BlockToggleAlertDialogProps) {
	const actionLabel = isBlockedByMe ? "Unblock" : "Block";
	const description = isBlockedByMe
		? "You will be able to exchange messages again."
		: "You will no longer receive messages from this user.";

	return (
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{isBlockedByMe ? "Unblock this user?" : "Block this user?"}
					</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={pending}
						onClick={onConfirm}
						variant={isBlockedByMe ? "default" : "destructive"}
					>
						{actionLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
