export interface ChatModalSearch {
	modal?: "settings";
}

export function validateChatModalSearch(
	search: Record<string, unknown>
): ChatModalSearch {
	return {
		modal: search.modal === "settings" ? "settings" : undefined,
	};
}
