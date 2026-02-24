export interface ReplyTarget {
	id: string;
	senderName: string;
	text: string;
}

export type DmPresence = {
	status: "online" | "offline";
	lastSeenAt: Date | null;
} | null;
