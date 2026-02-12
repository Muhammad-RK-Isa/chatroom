import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackRouter({}),
		react(),
		ViteImageOptimizer({
			logStats: true,
			includePublic: true,
			png: { quality: 85 },
			jpeg: { quality: 85 },
			webp: { quality: 85 },
			avif: { quality: 80 },
		}),
	],
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 3000,
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom"],
					router: ["@tanstack/react-router"],
					query: ["@tanstack/react-query"],
				},
			},
		},
	},
});
