// A tiny static file server standing in for a production static host, resolving clean
// URLs the way one would: `/foo` serves `foo.html` (the shape `next build`'s export
// produces for this app -- trailingSlash is false, see apps/web/next.config.ts), `/`
// serves `index.html`, an asset at its own exact path serves as-is, and anything that
// resolves to nothing falls back to the export's own `404.html` (docs/testing.md).
//
// No dependency beyond Node itself -- this exists only so packages/e2e/scripts/
// build-and-serve-web.mjs can serve a real static export without adding a runtime
// dependency to apps/web.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

async function isFile(candidate) {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolves a request pathname (no query string, already URL-decoded) to a file inside
 * `rootDir`, or `null` when nothing matches -- the caller falls back to `404.html`.
 * Exported for direct use (and, if it's ever worth it, a unit test) separately from the
 * HTTP server below.
 */
export async function resolveStaticFile(rootDir, pathname) {
  const normalized = path.posix.normalize(pathname);
  // Reject path traversal before touching the filesystem -- a decoded "../../etc" has
  // no ".." left after path.posix.normalize only when it never escapes the root; since
  // pathname always starts with "/", normalize alone can't climb above rootDir, but a
  // literal ".." segment surviving normalization (e.g. a root-relative "/..") still
  // means something is wrong with the request, so it's refused rather than resolved.
  if (normalized.split("/").includes("..")) return null;

  const candidates = normalized.endsWith("/")
    ? [path.join(rootDir, normalized, "index.html")]
    : [
        path.join(rootDir, normalized),
        `${path.join(rootDir, normalized)}.html`,
        path.join(rootDir, normalized, "index.html"),
      ];

  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

/** Starts listening immediately; the caller owns the returned server's lifecycle. */
export function createStaticServer(rootDir, port) {
  const server = createServer((req, res) => {
    void handleRequest(rootDir, req, res);
  });
  server.listen(port);
  return server;
}

async function handleRequest(rootDir, req, res) {
  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  let filePath;
  try {
    filePath = await resolveStaticFile(rootDir, requestUrl.pathname);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`500 Internal Server Error\n${String(err)}`);
    return;
  }

  const notFoundPath = path.join(rootDir, "404.html");
  const servePath =
    filePath ?? ((await isFile(notFoundPath)) ? notFoundPath : null);
  if (!servePath) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  try {
    const body = await readFile(servePath);
    const contentType =
      MIME_TYPES[path.extname(servePath)] ?? "application/octet-stream";
    res.writeHead(filePath ? 200 : 404, { "content-type": contentType });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`500 Internal Server Error\n${String(err)}`);
  }
}
