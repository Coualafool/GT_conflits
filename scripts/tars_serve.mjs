#!/usr/bin/env node
/* Tiny static file server rooted at this repo — replaces `python -m http.server`
   (python is broken on TARS). Run from anywhere; serves the repo root.
   Usage: node scripts/tars_serve.mjs [port]   (default 8899) */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, normalize, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2] || 8899);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".md": "text/markdown; charset=utf-8" };

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = resolve(ROOT, "." + normalize(path));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("403"); }
    const data = await readFile(file.endsWith("\\") || file.endsWith("/") ? file + "index.html" : file);
    res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("404"); }
}).listen(PORT, () => console.log(`GT_conflits static server: http://localhost:${PORT} root=${ROOT}`));
