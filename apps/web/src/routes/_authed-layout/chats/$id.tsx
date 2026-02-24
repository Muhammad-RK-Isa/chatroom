import { createFileRoute } from "@tanstack/react-router";
import { ChatShell } from "~/features/chat/chat-shell";
import { validateChatModalSearch } from "../chat-modal-search";

export const Route = createFileRoute("/_authed-layout/chats/$id")({
	validateSearch: validateChatModalSearch,
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = Route.useNavigate();
	const search = Route.useSearch();

	const handleOpenSettings = () => {
		navigate({
			to: "/chats/$id",
			params: { id },
			search: (previousSearch) => ({
				...previousSearch,
				modal: "settings",
			}),
			mask: {
				to: "/settings",
			},
		});
	};

	const handleSettingsModalOpenChange = (open: boolean) => {
		if (open) {
			handleOpenSettings();
			return;
		}

		if (window.history.length > 1) {
			window.history.back();
			return;
		}

		navigate({
			to: "/chats/$id",
			params: { id },
			replace: true,
			search: (previousSearch) => ({
				...previousSearch,
				modal: undefined,
			}),
		});
	};

	return (
		<ChatShell
			conversationId={id}
			isSettingsModalOpen={search.modal === "settings"}
			onOpenSettings={handleOpenSettings}
			onSettingsModalOpenChange={handleSettingsModalOpenChange}
		/>
	);
}
