import { Button } from "~/components/ui/button";

interface MessageRequestBannerProps {
	onAcceptRequest: () => void;
	onToggleBlock: () => void;
}

export function MessageRequestBanner({
	onAcceptRequest,
	onToggleBlock,
}: MessageRequestBannerProps) {
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
