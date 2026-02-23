const appName = "Chatroom";
const appSlug = "chatroom";

export const siteConfig = {
	name: appName,
	title: appName,
	description: `${appName} is a web application`,
	slug: appSlug,
	themeStorageKey: `${appSlug}-theme`,
} as const;
