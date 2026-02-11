import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { GitHub } from "~/components/icons/github";
import { Google } from "~/components/icons/google";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_auth-layout/sign-in")({
	component: RouteComponent,
});

function RouteComponent() {
	const [authStatus, setAuthStatus] = React.useState<{
		loading: boolean;
		provider?: "google" | "github";
	}>({ loading: false });

	const isAuthingGoogle =
		authStatus.loading && authStatus.provider === "google";
	const isAuthingGitHub =
		authStatus.loading && authStatus.provider === "github";

	const handleSignInWithGoogle = () => {
		setAuthStatus({ loading: true, provider: "google" });
		authClient.signIn
			.social({
				provider: "google",
				errorCallbackURL: "/authentication-error",
				callbackURL: location.origin,
			})
			.catch(() => {
				setAuthStatus({ loading: false, provider: undefined });
			});
	};

	const handleSignInWithGitHub = () => {
		setAuthStatus({ loading: true, provider: "github" });
		authClient.signIn
			.social({
				provider: "github",
				errorCallbackURL: "/authentication-error",
				callbackURL: location.origin,
			})
			.catch(() => {
				setAuthStatus({ loading: false, provider: undefined });
			});
	};

	return (
		<Card className="min-w-xs">
			<CardHeader>
				<CardTitle>Sign In</CardTitle>
				<CardDescription>to continue to Chatroom</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col space-y-2">
				<Button
					disabled={authStatus.loading}
					onClick={handleSignInWithGoogle}
					size="lg"
					variant="outline"
				>
					{isAuthingGoogle ? (
						<HugeiconsIcon className="animate-spin" icon={Loading03Icon} />
					) : (
						<Google />
					)}
					Sign In With Google
				</Button>
				<Button
					disabled={authStatus.loading}
					onClick={handleSignInWithGitHub}
					size="lg"
					variant="outline"
				>
					{isAuthingGitHub ? (
						<HugeiconsIcon className="animate-spin" icon={Loading03Icon} />
					) : (
						<GitHub />
					)}
					Sign In With GitHub
				</Button>
			</CardContent>
		</Card>
	);
}
