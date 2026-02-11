import { Button, ErrorView, Spinner, Surface, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { authClient } from "~/lib/auth-client";
import { queryClient } from "~/utils/orpc";

function signUpHandler({
	name,
	email,
	password,
	setError,
	setIsLoading,
	setName,
	setEmail,
	setPassword,
}: {
	name: string;
	email: string;
	password: string;
	setError: (error: string | null) => void;
	setIsLoading: (loading: boolean) => void;
	setName: (name: string) => void;
	setEmail: (email: string) => void;
	setPassword: (password: string) => void;
}) {
	setIsLoading(true);
	setError(null);

	authClient.signUp.email(
		{
			name,
			email,
			password,
		},
		{
			onError(error) {
				setError(error.error?.message || "Failed to sign up");
				setIsLoading(false);
			},
			onSuccess() {
				setName("");
				setEmail("");
				setPassword("");
				queryClient.refetchQueries();
			},
			onFinished() {
				setIsLoading(false);
			},
		}
	);
}

export function SignUp() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function handlePress() {
		signUpHandler({
			name,
			email,
			password,
			setError,
			setIsLoading,
			setName,
			setEmail,
			setPassword,
		});
	}

	return (
		<Surface className="rounded-lg p-4" variant="secondary">
			<Text className="mb-4 font-medium text-foreground">Create Account</Text>

			<ErrorView className="mb-3" isInvalid={!!error}>
				{error}
			</ErrorView>

			<View className="gap-3">
				<TextField>
					<TextField.Label>Name</TextField.Label>
					<TextField.Input
						onChangeText={setName}
						placeholder="John Doe"
						value={name}
					/>
				</TextField>

				<TextField>
					<TextField.Label>Email</TextField.Label>
					<TextField.Input
						autoCapitalize="none"
						keyboardType="email-address"
						onChangeText={setEmail}
						placeholder="email@example.com"
						value={email}
					/>
				</TextField>

				<TextField>
					<TextField.Label>Password</TextField.Label>
					<TextField.Input
						onChangeText={setPassword}
						placeholder="••••••••"
						secureTextEntry
						value={password}
					/>
				</TextField>

				<Button className="mt-1" isDisabled={isLoading} onPress={handlePress}>
					{isLoading ? (
						<Spinner color="default" size="sm" />
					) : (
						<Button.Label>Create Account</Button.Label>
					)}
				</Button>
			</View>
		</Surface>
	);
}
