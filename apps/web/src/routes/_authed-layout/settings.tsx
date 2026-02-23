import { createFileRoute, useRouter } from "@tanstack/react-router";
import { MoonIcon, SunIcon } from "lucide-react";
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

export const Route = createFileRoute("/_authed-layout/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	const router = useRouter();
	const { setTheme } = useTheme();

	const handleSignOut = async () => {
		await authClient.signOut();
		await router.invalidate();
	};

	return (
		<div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-4 py-6">
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
					<Button onClick={handleSignOut} type="button" variant="destructive">
						Sign out
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
