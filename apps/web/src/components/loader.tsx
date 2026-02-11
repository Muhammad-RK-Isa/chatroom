import { LoaderPinwheel } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function Loader() {
	return (
		<div className="flex h-full items-center justify-center pt-8">
			<HugeiconsIcon icon={LoaderPinwheel} />
		</div>
	);
}
