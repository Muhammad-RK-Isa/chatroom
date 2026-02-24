import { useRouter } from "@tanstack/react-router";
import { MoonIcon, SunIcon } from "lucide-react";
import { useState } from "react";
import { SignOutAlertDialog } from "~/components/sign-out-alert-dialog";
import { useTheme } from "~/components/theme-provider";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

interface SettingsContentProps {
	className?: string;
}

export function SettingsContent({ className }: SettingsContentProps) {
	const router = useRouter();
	const { setTheme } = useTheme();
	const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
	const [isSignOutPending, setIsSignOutPending] = useState(false);

	const handleConfirmSignOut = async () => {
		setIsSignOutPending(true);
		try {
			await authClient.signOut();
			await router.invalidate();
			setIsSignOutDialogOpen(false);
		} finally {
			setIsSignOutPending(false);
		}
	};

	return (
		<>
			<div
				className={cn(
					"mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-4 py-6",
					className
				)}
			>
				<Card>
					<CardHeader>
						<CardTitle>Appearance</CardTitle>
						<CardDescription>Choose your preferred theme.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						<Button
							onClick={() => setTheme("light")}
							type="button"
							variant="outline"
						>
							<SunIcon className="size-4" />
							Light
						</Button>
						<Button
							onClick={() => setTheme("dark")}
							type="button"
							variant="outline"
						>
							<MoonIcon className="size-4" />
							Dark
						</Button>
						<Button
							onClick={() => setTheme("system")}
							type="button"
							variant="outline"
						>
							System
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Account</CardTitle>
						<CardDescription>Manage your current session.</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={() => setIsSignOutDialogOpen(true)}
							type="button"
							variant="destructive"
						>
							Sign out
						</Button>
					</CardContent>
				</Card>
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
