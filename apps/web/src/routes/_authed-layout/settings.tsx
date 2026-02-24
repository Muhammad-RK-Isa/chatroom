import { createFileRoute } from "@tanstack/react-router";
import { SettingsContent } from "~/features/settings/settings-content";

export const Route = createFileRoute("/_authed-layout/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	return <SettingsContent />;
}
