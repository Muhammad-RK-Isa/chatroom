import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth-layout/authentication-error")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_auth-layout/authentication-error"!</div>;
}
