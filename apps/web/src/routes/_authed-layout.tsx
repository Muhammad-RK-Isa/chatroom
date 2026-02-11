import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_authed-layout")({
	beforeLoad: async () => {
		const isAuthed = await authClient
			.getSession()
			.then(({ data }) => !!data?.session);
		if (!isAuthed) {
			throw redirect({ to: "/sign-in" });
		}
		return;
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
