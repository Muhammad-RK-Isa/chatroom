import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					<Link className="font-medium" to="/">
						Chatroom
					</Link>
				</nav>
				<div className="flex items-center gap-2">
					<Link className="font-medium" to="/sign-in">
						Sign In
					</Link>
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}
