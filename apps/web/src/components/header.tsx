import { Link } from "@tanstack/react-router";
import { Image } from "~/components/image";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					<Link to="/">
						<div className="flex items-center gap-2 font-medium">
							<Image
								alt="Chatroom logo"
								className="size-5"
								fill
								src="/app-logo.png"
							/>
							<span className="font-mono">Chatroom</span>
						</div>
					</Link>
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}
