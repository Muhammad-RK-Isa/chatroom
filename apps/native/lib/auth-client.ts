import { expoClient } from "@better-auth/expo/client";
import { env } from "@chatroom/env/native";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
// biome-ignore lint/performance/noNamespaceImport: SecureStore is passed as a namespace object to the expo client plugin
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
	baseURL: env.EXPO_PUBLIC_SERVER_URL,
	plugins: [
		expoClient({
			scheme: Constants.expoConfig?.scheme as string,
			storagePrefix: Constants.expoConfig?.scheme as string,
			storage: SecureStore,
		}),
	],
});
