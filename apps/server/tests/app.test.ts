import { describe, expect, test } from "bun:test";

const requiredEnv = {
	DATABASE_URL: "postgres://user:pass@localhost:5432/chatroom_test",
	BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-test",
	BETTER_AUTH_URL: "https://auth.example.com",
	CORS_ORIGIN: "https://web.example.com",
	NODE_ENV: "test",
	GOOGLE_CLIENT_ID: "test-google-client-id",
	GOOGLE_CLIENT_SECRET: "test-google-client-secret",
	GITHUB_CLIENT_ID: "test-github-client-id",
	GITHUB_CLIENT_SECRET: "test-github-client-secret",
};

for (const [key, value] of Object.entries(requiredEnv)) {
	process.env[key] = value;
}

const { app } = await import("../src/index");

describe("server app", () => {
	test("health check returns OK", async () => {
		const response = await app.request("http://localhost/");
		const body = await response.text();

		expect(response.status).toBe(200);
		expect(body).toBe("OK");
	});

	test("sets CORS headers using request origin", async () => {
		const origin = "https://example.com";
		const response = await app.request("http://localhost/", {
			headers: {
				Origin: origin,
			},
		});

		expect(response.headers.get("access-control-allow-origin")).toBe(origin);
		expect(response.headers.get("access-control-allow-credentials")).toBe(
			"true"
		);
	});

	test("sets CORS headers using default origin when missing", async () => {
		const response = await app.request("http://localhost/");

		expect(response.headers.get("access-control-allow-origin")).toBe(
			requiredEnv.CORS_ORIGIN
		);
		expect(response.headers.get("access-control-allow-credentials")).toBe(
			"true"
		);
	});
});
