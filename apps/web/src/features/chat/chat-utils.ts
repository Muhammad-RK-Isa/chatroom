export function getInitials(name: string): string {
	return name
		.split(" ")
		.filter((part) => part.length > 0)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export function formatMessageTime(date: Date): string {
	return date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatConversationTimestamp(date: Date): string {
	const now = Date.now();
	const diffMs = now - date.getTime();
	const minuteMs = 60_000;
	const hourMs = 60 * minuteMs;
	const dayMs = 24 * hourMs;

	if (diffMs < dayMs) {
		return formatMessageTime(date);
	}

	if (diffMs < dayMs * 7) {
		return date.toLocaleDateString([], { weekday: "short" });
	}

	return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatLastSeen(
	status: "online" | "offline",
	lastSeenAt: Date | null
): string {
	if (status === "online") {
		return "Online";
	}

	if (!lastSeenAt) {
		return "Offline";
	}

	const diff = Date.now() - lastSeenAt.getTime();
	const minutes = Math.floor(diff / 60_000);

	if (minutes < 1) {
		return "Last seen just now";
	}

	if (minutes < 60) {
		return `Last seen ${minutes}m ago`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `Last seen ${hours}h ago`;
	}

	const days = Math.floor(hours / 24);
	return `Last seen ${days}d ago`;
}
