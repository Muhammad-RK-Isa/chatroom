import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed-layout/chats/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_authed-layout/chats/$id"!</div>;
}
