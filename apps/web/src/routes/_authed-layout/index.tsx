import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";

import { orpc } from "~/utils/orpc";

export const Route = createFileRoute("/_authed-layout/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
              ██████╗██╗  ██╗ █████╗ ████████╗██████╗  ██████╗  ██████╗ ███╗   ███╗
             ██╔════╝██║  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║
             ██║     ███████║███████║   ██║   ██████╔╝██║   ██║██║   ██║██╔████╔██║
             ██║     ██╔══██║██╔══██║   ██║   ██╔══██╗██║   ██║██║   ██║██║╚██╔╝██║
             ╚██████╗██║  ██║██║  ██║   ██║   ██║  ██║╚██████╔╝╚██████╔╝██║ ╚═╝ ██║
              ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚═╝
`;

function HomeComponent() {
	const healthCheck = useQuery(orpc.healthCheck.queryOptions());
	const router = useRouter();

	const handleSignOut = async () => {
		await authClient.signOut();
		await router.invalidate();
	};

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
			<div className="mt-6 grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{healthCheck.isLoading
								? "Checking..."
								: healthCheck.data
									? "Connected"
									: "Disconnected"}
						</span>
					</div>
				</section>
				<Button
					className="mx-auto w-max"
					onClick={handleSignOut}
					variant="destructive"
				>
					Sign Out
				</Button>
			</div>
		</div>
	);
}
