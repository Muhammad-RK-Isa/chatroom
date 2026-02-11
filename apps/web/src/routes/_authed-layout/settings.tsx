import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed-layout/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_authed-layout/settings"!</div>;
}
