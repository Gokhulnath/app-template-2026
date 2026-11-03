// `useIsMacDesktopShell()` below is a hook, so this needs its own client boundary:
// `apps/web/src/app/layout.tsx` (a Server Component) mounts this component directly,
// with no other "use client" file in between to cross into the client bundle the way
// every other call site in `apps/web` happens to (its own page content is reached
// through client components already). Without this directive, `next build`'s static
// export prerender runs this component with the RSC server renderer instead, which has
// no `useSyncExternalStore` to call and fails the build outright.
"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { useIsMacDesktopShell } from "../lib/platform";

/**
 * The traffic-light gutter's width on the Mac desktop shell: `tauri.macos.conf.json`
 * insets the native buttons at x:16 and the three-button cluster runs about another
 * ~50px, so 80px (`w-20`, already on the token/Tailwind spacing scale) clears them
 * with a little breathing room before anything else this bar renders.
 */
const MAC_TRAFFIC_LIGHT_GUTTER = "w-20";

export interface TitleBarProps {
  /**
   * Content placed after the traffic-light gutter -- a wordmark, a page title, or
   * nothing. `TitleBar` has no opinion on what goes here: this template ships no
   * header of its own to repurpose (unlike a product built from it, which should
   * reserve this gutter inside its *own* top bar instead of mounting this component
   * standalone -- see this file's own doc comment below).
   */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The window's title-bar chrome on the Mac desktop shell (`useIsMacDesktopShell`,
 * `packages/ui/src/lib/platform.ts`): reserves a leading gutter for the OS's inset
 * traffic lights (`apps/desktop/src-tauri/tauri.macos.conf.json`) and makes itself the
 * window's drag region (`data-tauri-drag-region="deep"`), so the whole strip -- minus
 * any button/link/input it contains, which Tauri's own `drag.js` checks *before* it
 * ever looks at this attribute -- drags the window, with double-click-to-zoom for
 * free via Tauri 2's own drag-region handling.
 *
 * Renders nothing on web (including Safari/Chrome on a Mac), Windows/Linux and phones,
 * since `useIsMacDesktopShell` is false everywhere but the packaged macOS build, by
 * construction: there's no native title bar to replace there, so this component has no
 * job to do and no footprint.
 *
 * This template ships no top bar of its own, so `TitleBar` is a plain, minimal strip
 * mounted once in `apps/web/src/app/layout.tsx`. A product built from this template
 * that adds a real top bar should reserve this same gutter and drag attribute *inside*
 * that bar instead of stacking a second one -- fold both into the existing header's
 * own leading slot and drag-region attribute.
 */
export function TitleBar({ children, className }: TitleBarProps) {
  const isMacDesktopShell = useIsMacDesktopShell();
  if (!isMacDesktopShell) return null;

  return (
    <div
      data-testid="title-bar"
      // "deep": any click inside the bar that doesn't land on a clickable element
      // starts a window drag or, on a double-click, zooms -- Tauri's native
      // equivalent of double-clicking a real title bar.
      data-tauri-drag-region="deep"
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface",
        className,
      )}
    >
      <span
        aria-hidden="true"
        // `self-stretch`, not `h-full`: a percentage height only resolves against a
        // *definite* containing-block height, and a flex item whose own ancestor is
        // `items-center` with no explicit height of its own never gets one (`h-full`
        // would silently resolve to 0 there). `self-stretch` stretches this one flex
        // item to its row's own height regardless of that ancestor's alignment.
        className={cn("self-stretch shrink-0", MAC_TRAFFIC_LIGHT_GUTTER)}
      />
      {children}
    </div>
  );
}
