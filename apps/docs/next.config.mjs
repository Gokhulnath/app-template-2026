import { createMDX } from "fumadocs-mdx/next";

// Fumadocs MDX is ESM-only, so this file stays .mjs rather than apps/web's .ts (see
// https://fumadocs.dev/docs/manual-installation/next, "ESM Only").
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML/JS in out/, same as apps/web: no server, so any static host can serve it.
  output: "export",
  images: { unoptimized: true },
  // @myapp/tokens is consumed as source (no build step) for its CSS only; nothing here
  // needs transpilePackages since no JS/TSX of ours imports it.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withMDX(nextConfig);
