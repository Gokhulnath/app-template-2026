import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML/JS in out/, so desktop shells (Tauri) and any static host can serve it.
  // Export mode also makes `next build` fail on server-only features (cookies(), server
  // actions, route handlers that read the request, proxy), which keeps all logic in the API.
  // Cache Components and Partial Prefetching (create-next-app defaults) are off because
  // they can't be combined with an export.
  output: "export",
  // next/image's default loader needs a server; serve images as-is.
  images: { unoptimized: true },
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
