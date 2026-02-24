import { useRouter } from "@tanstack/react-router";
import {
	LaptopIcon,
	LogOutIcon,
	MoonIcon,
	MoreHorizontalIcon,
	SettingsIcon,
	SunIcon,
} from "lucide-react";
import { useState } from "react";
import { HalfMoon } from "~/components/icons/half-moon";
import { SignOutAlertDialog } from "~/components/sign-out-alert-dialog";
import { useTheme } from "~/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { authClient } from "~/lib/auth-client";
import { getInitials } from "../chat-utils";

interface UserMenuProps {
	onOpenSettings: () => void;
}

export function UserMenu({ onOpenSettings }: UserMenuProps) {
	const router = useRouter();
	const currentUser = authClient.useSession().data?.user;
	const { setTheme, themes, theme } = useTheme();
	const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
	const [isSignOutPending, setIsSignOutPending] = useState(false);

	async function handleConfirmSignOut() {
		setIsSignOutPending(true);
		try {
			await authClient.signOut();
			await router.invalidate();
			setIsSignOutDialogOpen(false);
		} finally {
			setIsSignOutPending(false);
		}
	}

	return (
		<>
			<div className="px-2 py-2">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								className="h-auto w-full justify-start gap-3 rounded-xl px-2 py-1"
								size="lg"
								variant="ghost"
							/>
						}
					>
						<Avatar className="size-8">
							<AvatarImage
								alt={currentUser?.username}
								src={currentUser?.image ?? ""}
							/>
							<AvatarFallback>
								{getInitials(currentUser?.name ?? "User")}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1 text-left">
							<p className="truncate font-medium text-xs">
								{currentUser?.name ?? "Your account"}
							</p>
							<p className="truncate text-muted-foreground text-xs">
								@{currentUser?.username ?? "user"}
							</p>
						</div>
						<MoreHorizontalIcon />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" side="top">
						<div className="px-2 py-1.5">
							<p className="truncate font-medium text-sm">
								{currentUser?.name ?? "Your account"}
							</p>
							<p className="truncate text-muted-foreground text-xs">
								{currentUser?.email ?? ""}
							</p>
						</div>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onOpenSettings}>
							<SettingsIcon className="size-4" />
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<HalfMoon />
								Theme
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
									{themes.map((thm) => (
										<DropdownMenuRadioItem
											className="capitalize"
											key={thm}
											value={thm}
										>
											{thm === "light" ? (
												<SunIcon />
											) : thm === "dark" ? (
												<MoonIcon />
											) : (
												<LaptopIcon />
											)}
											{thm}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => setIsSignOutDialogOpen(true)}
							variant="destructive"
						>
							<LogOutIcon className="size-4" />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<SignOutAlertDialog
				onConfirm={handleConfirmSignOut}
				onOpenChange={setIsSignOutDialogOpen}
				open={isSignOutDialogOpen}
				pending={isSignOutPending}
			/>
		</>
	);
}
