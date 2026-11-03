import * as React from "react";

/**
 * True only inside the packaged macOS desktop app (`apps/desktop`'s Tauri shell) --
 * never on web (including Safari/Chrome on a Mac) and never on the Windows or Linux
 * desktop build, which keep native window decorations. `window.__TAURI_INTERNALS__` is
 * the global every Tauri 2 webview injects before any app code runs, so checking it
 * first rules out every browser tab; `navigator.platform` is reliable *given* that --
 * it's read inside a real macOS WebKit webview at that point, not guessed from a
 * server-rendered request.
 */
function isMacDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const hasTauri = Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__,
  );
  if (!hasTauri) return false;
  const platform =
    window.navigator.platform || window.navigator.userAgent || "";
  return /Mac/.test(platform);
}

// This value never changes after mount (the platform doesn't), so there's nothing to
// resubscribe to -- it renders the neutral server/build-time snapshot first
// (`apps/web` is a Next.js static export) and the real, client-only value as of this
// same render once mounted, with no post-mount `setState` and no risk of a flash.
function noopSubscribe() {
  return () => {};
}

/**
 * The one shared answer to "is this the Mac desktop shell?" -- every macOS-only chrome
 * decision (today: `TitleBar`'s traffic-light drag inset) reads from this hook instead
 * of re-deriving its own platform check, so web, Windows/Linux and phones stay
 * unchanged by construction: they can never see a `true` here.
 */
export function useIsMacDesktopShell(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    isMacDesktopShell,
    () => false,
  );
}
