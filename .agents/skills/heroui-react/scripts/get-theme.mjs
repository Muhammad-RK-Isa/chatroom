#!/usr/bin/env node
/**
 * Get theme variables and design tokens for HeroUI v3.
 *
 * Usage:
 *   node get-theme.mjs
 *
 * Output:
 *   Theme variables organized by common/light/dark with oklch color format
 */

const API_BASE = process.env.HEROUI_API_BASE || "https://mcp-api.heroui.com";
const APP_PARAM = "app=react-skills";

// Fallback theme reference when API is unavailable
const FALLBACK_THEME = {
	common: {
		base: [
			{ name: "--font-sans", value: "ui-sans-serif, system-ui, sans-serif" },
			{ name: "--font-mono", value: "ui-monospace, monospace" },
			{ name: "--radius-sm", value: "0.375rem" },
			{ name: "--radius-md", value: "0.5rem" },
			{ name: "--radius-lg", value: "0.75rem" },
			{ name: "--radius-full", value: "9999px" },
		],
		calculated: [{ name: "--spacing-unit", value: "0.25rem" }],
	},
	dark: {
		semantic: [
			{ name: "--color-background", value: "oklch(14.5% 0 0)" },
			{ name: "--color-foreground", value: "oklch(98.4% 0 0)" },
			{ name: "--color-accent", value: "oklch(55.1% 0.228 264.1)" },
			{ name: "--color-danger", value: "oklch(63.7% 0.237 25.3)" },
			{ name: "--color-success", value: "oklch(76.5% 0.177 163.2)" },
			{ name: "--color-warning", value: "oklch(79.5% 0.184 86.0)" },
		],
	},
	latestVersion: "3.0.0-beta",
	light: {
		semantic: [
			{ name: "--color-background", value: "oklch(100% 0 0)" },
			{ name: "--color-foreground", value: "oklch(14.5% 0 0)" },
			{ name: "--color-accent", value: "oklch(55.1% 0.228 264.1)" },
			{ name: "--color-danger", value: "oklch(63.7% 0.237 25.3)" },
			{ name: "--color-success", value: "oklch(76.5% 0.177 163.2)" },
			{ name: "--color-warning", value: "oklch(79.5% 0.184 86.0)" },
		],
	},
	note: "This is a fallback. For complete theme variables, ensure the API is accessible.",
	source: "fallback",
	theme: "default",
};

/**
 * Fetch data from HeroUI API with app parameter for analytics.
 */
async function fetchApi(endpoint) {
	const separator = endpoint.includes("?") ? "&" : "?";
	const url = `${API_BASE}${endpoint}${separator}${APP_PARAM}`;

	try {
		const response = await fetch(url, {
			headers: { "User-Agent": "HeroUI-Skill/1.0" },
			signal: AbortSignal.timeout(30_000),
		});

		if (!response.ok) {
			console.error(`# API Error: HTTP ${response.status}`);

			return null;
		}

		return await response.json();
	} catch (error) {
		console.error(`# API Error: ${error.message}`);

		return null;
	}
}

/**
 * Format theme variables for display.
 */
function formatVariables(variables) {
	const lines = [];

	for (const variable of variables) {
		const name = variable.name || "";
		const value = variable.value || "";
		const desc = variable.description || "";

		if (desc) {
			lines.push(`  ${name}: ${value}; /* ${desc} */`);
		} else {
			lines.push(`  ${name}: ${value};`);
		}
	}

	return lines.join("\n");
}

/**
 * Resolve raw API response into theme data and version.
 */
function resolveThemeData(rawData) {
	if (!rawData) {
		console.error("# API failed, using fallback theme reference...");
		return {
			data: FALLBACK_THEME,
			version: FALLBACK_THEME.latestVersion || "unknown",
		};
	}

	// Handle API response format: { themes: [...], latestVersion: "..." }
	if (rawData.themes && rawData.themes.length > 0) {
		return {
			data: rawData.themes[0],
			version: rawData.latestVersion || rawData.version || "unknown",
		};
	}

	return { data: rawData, version: rawData.latestVersion || "unknown" };
}

/**
 * Print a themed CSS section with a selector, comment, and variables.
 */
function printThemeSection(selector, comment, variables) {
	console.log(`${selector} {`);
	console.log(`  /* ${comment} */`);
	if (variables) {
		console.log(formatVariables(variables));
	}
	console.log("}");
	console.log();
}

/**
 * Main function to get theme variables.
 */
async function main() {
	console.error("# Fetching theme variables...");

	const rawData = await fetchApi("/v1/themes/variables?theme=default");
	const { data, version } = resolveThemeData(rawData);

	// Output as formatted CSS-like structure for readability
	console.log("/* HeroUI v3 Theme Variables */");
	console.log(`/* Theme: ${data.theme || "default"} */`);
	console.log(`/* Version: ${version} */`);
	console.log();

	// Common variables
	if (data.common) {
		console.log(":root {");
		console.log("  /* Base Variables */");
		if (data.common.base) {
			console.log(formatVariables(data.common.base));
		}
		console.log();
		console.log("  /* Calculated Variables */");
		if (data.common.calculated) {
			console.log(formatVariables(data.common.calculated));
		}
		console.log("}");
		console.log();
	}

	if (data.light) {
		printThemeSection(
			":root, [data-theme='light']",
			"Light Mode Semantic Variables",
			data.light.semantic
		);
	}

	if (data.dark) {
		printThemeSection(
			"[data-theme='dark']",
			"Dark Mode Semantic Variables",
			data.dark.semantic
		);
	}

	// Also output raw JSON to stderr for programmatic use
	console.error("\n# Raw JSON output:");
	console.error(JSON.stringify(rawData || data, null, 2));
}

main();
