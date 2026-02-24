import { Dialog, DialogContent } from "~/components/ui/dialog";
import { SettingsContent } from "~/features/settings/settings-content";

interface SettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="max-h-[90dvh] max-w-[calc(100%-1.5rem)] overflow-y-auto p-0 sm:max-w-3xl"
				showCloseButton={false}
			>
				<SettingsContent />
			</DialogContent>
		</Dialog>
	);
}
