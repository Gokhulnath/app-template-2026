import { expect, test } from "@playwright/test";

import { E2E_API_URL } from "../src/env.js";

/**
 * This template has no auth yet (docs/testing.md), so this suite can't drive a real
 * sign-in the way a product that has one eventually will. What it proves instead: the
 * page loaded in a real browser, served from this harness's own static export, actually
 * talks to this harness's own API -- not a hardcoded default, not the owner's own
 * running dev stack. apps/web/src/components/api-status.tsx is the home page's own
 * already-shipped health check; this spec asserts on its real network round trip rather
 * than adding a test-only hook to apps/web (CLAUDE.md: no hooks added to production code
 * only for tests).
 */
test("the web app reaches this harness's own API, not a default or a dev stack", async ({
  page,
}) => {
  await page.goto("/");

  // The page prints the API URL it was built with (apps/web/src/app/page.tsx). Catches
  // NEXT_PUBLIC_API_URL ever getting baked into the static export wrong -- the one thing
  // a Node-side check against E2E_API_URL can't, since it never goes through the build.
  await expect(page.getByText(E2E_API_URL, { exact: false })).toBeVisible();

  // The status starts as "checking…" and settles once the browser's own fetch to
  // NEXT_PUBLIC_API_URL + "/health" resolves (api-status.tsx). "unreachable" means the
  // request never completed (wrong origin, CORS, or nothing listening there); "error
  // (HTTP ...)" means it reached something that isn't this harness's API. Either is a
  // real failure; "ok" and "degraded (database ...)" both prove the round trip worked --
  // this harness runs its own API with no database behind it, so "degraded" is the
  // expected, passing outcome here (see docs/testing.md).
  const status = page.getByTestId("api-status");
  await expect(status).not.toHaveText("checking…");
  await expect(status).not.toHaveText("unreachable");
  await expect(status).not.toContainText("error");
  await expect(status).toHaveText(/^(ok|degraded \(database .+\))$/);
});
