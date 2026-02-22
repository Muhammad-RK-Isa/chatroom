import { db } from "@chatroom/db";

const FALLBACK_USERNAME = "user";

export const getBaseUsername = (email: string | undefined): string => {
	const localPart = (email?.split("@")[0] ?? "").trim().toLowerCase();

	if (localPart.length === 0) {
		return FALLBACK_USERNAME;
	}

	return localPart;
};

export const isUsernameTaken = async (username: string): Promise<boolean> => {
	const existingUser = await db.query.users.findFirst({
		columns: {
			id: true,
		},
		where: (usersTable, { eq }) => eq(usersTable.username, username),
	});

	return existingUser !== undefined;
};

export const getAvailableUsername = async (
	baseUsername: string
): Promise<string> => {
	let suffix = 0;

	while (true) {
		const candidateUsername =
			suffix === 0 ? baseUsername : `${baseUsername}${suffix}`;

		if (!(await isUsernameTaken(candidateUsername))) {
			return candidateUsername;
		}

		suffix += 1;
	}
};
