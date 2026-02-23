import { createFileRoute } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
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
import { siteConfig } from "~/lib/site.config";

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
				<CardDescription>to continue to {siteConfig.name}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col space-y-2">
				<Button
					disabled={authStatus.loading}
					onClick={handleSignInWithGoogle}
					size="lg"
					variant="outline"
				>
					{isAuthingGoogle ? (
						<Loader2Icon className="animate-spin" />
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
						<Loader2Icon className="animate-spin" />
					) : (
						<GitHub />
					)}
					Sign In With GitHub
				</Button>
			</CardContent>
		</Card>
	);
}
