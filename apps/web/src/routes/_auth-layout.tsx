import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_auth-layout")({
	beforeLoad: async () => {
		const isAuthed = await authClient
			.getSession()
			.then(({ data }) => !!data?.session);
		if (isAuthed) {
			throw redirect({ to: "/" });
		}
		return;
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="relative flex w-full items-center justify-center bg-background">
			<div
				className={cn(
					"absolute inset-0",
					"bg-size-[20px_20px]",
					"bg-[radial-gradient(#d4d4d4_1px,transparent_1px)]",
					"dark:bg-[radial-gradient(#404040_1px,transparent_1px)]"
				)}
			/>
			{/* Radial gradient for the container to give a faded look */}
			<div className="mask-[radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none absolute inset-0 flex items-center justify-center bg-background" />
			<div className="relative z-20">
				<Outlet />
			</div>
		</div>
	);
}
