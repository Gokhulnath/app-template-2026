import * as React from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { TitleBar } from "./title-bar";

// `useIsMacDesktopShell` (packages/ui/src/lib/platform.ts) checks for
// `window.__TAURI_INTERNALS__` *and* a Mac `navigator.platform` -- the story below
// fakes both to prove the Mac-only drag inset without a real Tauri webview, and
// restores both globals afterward so later stories see the plain-browser defaults
// again. The install/restore pair runs synchronously, inside this wrapper's own
// render body rather than a `useEffect`: an effect only fires after the first render
// has already committed without the fake globals in place, so `TitleBar`'s first
// `useIsMacDesktopShell()` call would still see the plain-browser defaults.
function installFakeMacTauriShell(): () => void {
  const win = window as unknown as { __TAURI_INTERNALS__?: unknown };
  const hadTauri = "__TAURI_INTERNALS__" in win;
  const previousTauri = win.__TAURI_INTERNALS__;
  const previousPlatform = window.navigator.platform;

  win.__TAURI_INTERNALS__ = {};
  Object.defineProperty(window.navigator, "platform", {
    value: "MacIntel",
    configurable: true,
  });

  return () => {
    if (hadTauri) {
      win.__TAURI_INTERNALS__ = previousTauri;
    } else {
      delete win.__TAURI_INTERNALS__;
    }
    Object.defineProperty(window.navigator, "platform", {
      value: previousPlatform,
      configurable: true,
    });
  };
}

function MacDesktopShellPreview() {
  const restoreRef = React.useRef<(() => void) | null>(null);
  if (restoreRef.current === null) {
    restoreRef.current = installFakeMacTauriShell();
  }
  React.useEffect(() => {
    return () => restoreRef.current?.();
  }, []);

  return <TitleBar>myapp</TitleBar>;
}

const meta = {
  title: "Components/TitleBar",
  component: TitleBar,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TitleBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotMacDesktopShell: Story = {
  render: () => <TitleBar>myapp</TitleBar>,
  play: async ({ canvasElement }) => {
    // Every browser tab and every non-macOS desktop build renders nothing here, by
    // construction -- there's no fake Tauri shell in this story, so
    // `useIsMacDesktopShell()` is false the same way it genuinely is for them.
    await expect(
      within(canvasElement).queryByTestId("title-bar"),
    ).not.toBeInTheDocument();
  },
};

export const MacDesktopShellVisible: Story = {
  render: () => <MacDesktopShellPreview />,
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByTestId("title-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("data-tauri-drag-region", "deep");
  },
};
