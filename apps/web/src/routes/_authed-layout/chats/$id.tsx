import { createFileRoute } from "@tanstack/react-router";
import { ChatShell } from "~/features/chat/chat-shell";

export const Route = createFileRoute("/_authed-layout/chats/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();

	return <ChatShell conversationId={id} />;
}
