import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML/JS in out/, so desktop shells (Tauri) and any static host can serve it.
  // Export mode also makes `next build` fail on server-only features (cookies(), server
  // actions, route handlers that read the request, proxy), which keeps all logic in the API.
  // Cache Components and Partial Prefetching (create-next-app defaults) are off because
  // they can't be combined with an export.
  output: "export",
  // packages/e2e builds its own static export beside a developer's `next dev` running
  // from this same folder (docs/testing.md "Isolation rules") -- never apps/web/out,
  // which `pnpm build` and any static host deploy from. Only the e2e harness ever sets
  // this; unset (the normal case for `next dev`/`pnpm build`), it is a literal no-op:
  // Next.js treats `distDir: undefined` exactly like the key being absent, so the
  // export still lands in `out/` exactly as before. A custom value here only changes the
  // export's own destination -- intermediate build artifacts still live under `.next`
  // either way, the same `.next` a concurrent `next dev` never touches directly either
  // (it confines itself to `.next/dev`).
  distDir: process.env.MYAPP_WEB_DIST_DIR || undefined,
  // next/image's default loader needs a server; serve images as-is.
  images: { unoptimized: true },
  // @myapp/ui and @myapp/tokens are consumed as source (no build step), so Next.js has to
  // run its own TS/JS transform over them like it does for this app's own code.
  transpilePackages: ["@myapp/ui", "@myapp/tokens"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
