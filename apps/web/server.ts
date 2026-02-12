const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = `${import.meta.dir}/dist`;

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".otf": "font/otf",
	".eot": "application/vnd.ms-fontobject",
	".webm": "video/webm",
	".mp4": "video/mp4",
	".webmanifest": "application/manifest+json",
};

function getMimeType(path: string): string {
	const lastDot = path.lastIndexOf(".");
	const ext = lastDot === -1 ? "" : path.slice(lastDot);
	return MIME_TYPES[ext] ?? "application/octet-stream";
}

function joinPath(base: string, path: string): string {
	const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${normalizedBase}${normalizedPath}`;
}

const server = Bun.serve({
	port: PORT,
	fetch(req) {
		const url = new URL(req.url);
		let pathname = url.pathname;

		if (pathname === "/") {
			pathname = "/index.html";
		}

		const filePath = joinPath(DIST_DIR, pathname);
		const file = Bun.file(filePath);

		if (file.size > 0) {
			const mimeType = getMimeType(pathname);
			return new Response(file, {
				headers: {
					"Content-Type": mimeType,
					"Cache-Control": pathname.includes("/assets/")
						? "public, max-age=31536000, immutable"
						: "public, max-age=0, must-revalidate",
				},
			});
		}

		const indexPath = `${DIST_DIR}/index.html`;
		const indexFile = Bun.file(indexPath);
		return new Response(indexFile, {
			headers: { "Content-Type": "text/html" },
		});
	},
	error(err) {
		console.error("Server error:", err);
		return new Response("Internal Server Error", { status: 500 });
	},
});

console.log(`🌐 => http://localhost:${server.port} 🚀🚀`);
