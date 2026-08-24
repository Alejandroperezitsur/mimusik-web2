import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "public");
const base = process.env.PAGES_BASE_PATH || "/MiMusik-Web/";
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };
const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  if (!pathname.startsWith(base)) { response.writeHead(404); response.end("Not found"); return; }
  const relative = decodeURIComponent(pathname.slice(base.length)) || "index.html";
  const target = path.resolve(root, relative);
  if (!target.startsWith(root) || !existsSync(target) || statSync(target).isDirectory()) { response.writeHead(404); response.end("Not found"); return; }
  response.writeHead(200, { "Content-Type": mime[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-cache" }); createReadStream(target).pipe(response);
});
server.listen(4174, "0.0.0.0", () => console.log(`GitHub Pages verifier on http://localhost:4174${base}`));
