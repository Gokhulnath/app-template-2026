"use client";

import { useSyncExternalStore } from "react";

// Which shell is rendering this page, and the Origin the API will see from it. Useful when
// a new shell gets "unreachable" because its origin isn't in the API's CORS settings.
function detectShell(): string {
  if ("__TAURI_INTERNALS__" in window) return "Tauri";
  return "Browser";
}

const subscribe = () => () => {};

export function RuntimeInfo() {
  const runtime = useSyncExternalStore(
    subscribe,
    () => `${detectShell()} · origin ${window.location.origin}`,
    () => "…",
  );

  return <code data-testid="runtime">{runtime}</code>;
}
