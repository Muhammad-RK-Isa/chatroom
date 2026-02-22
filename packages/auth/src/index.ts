import { expo } from "@better-auth/expo";
import { db } from "@chatroom/db";
import { generateID } from "@chatroom/db/lib/utils";
// biome-ignore lint/performance/noNamespaceImport: schema namespace required by drizzle adapter
import * as schema from "@chatroom/db/schema";
import { env } from "@chatroom/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { getAvailableUsername, getBaseUsername } from "./lib/utils";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
		schema,
	}),
	user: {
		additionalFields: {
			username: {
				type: "string",
				required: true,
			},
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const baseUsername = getBaseUsername(user.email);
					const username = await getAvailableUsername(baseUsername);
					const userId = generateID("usr");

					return {
						data: {
							...user,
							id: userId,
							username,
						},
					};
				},
			},
		},
	},
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		},
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	trustedOrigins: [
		env.CORS_ORIGIN,
		"mybettertapp://",
		...(env.NODE_ENV === "development"
			? [
					"exp://",
					"exp://**",
					"exp://192.168.*.*:*/**",
					"http://localhost:8081",
				]
			: []),
	],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	plugins: [expo(), openAPI()],
});
