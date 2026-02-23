import { createFileRoute } from "@tanstack/react-router";
import { ChatShell } from "~/features/chat/chat-shell";

export const Route = createFileRoute("/_authed-layout/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <ChatShell />;
}
