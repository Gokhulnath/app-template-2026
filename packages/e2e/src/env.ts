import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * This package's own env-var contract (docs/testing.md "Isolation rules"). Every value
 * has a default that starts the harness's own API and web app on free, reserved ports
 * (8580/3580) -- never the owner's own running dev stack (API :8000, web :3000, the
 * `next dev`/`fastapi dev` defaults). Overriding either is how a CI runner, or a
 * different local port block, points the same suite somewhere else.
 */
export const E2E_API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8580";
export const E2E_WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:3580";

/** The port each webServer entry binds, parsed back out of the URLs above so there is
 * exactly one source of truth for "where" -- never a second, independently-overridable
 * port number. */
export function portOf(url: string): string {
  const parsed = new URL(url);
  if (parsed.port) return parsed.port;
  return parsed.protocol === "https:" ? "443" : "80";
}

// packages/e2e/src/env.ts -> repo root is two levels up.
const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");
