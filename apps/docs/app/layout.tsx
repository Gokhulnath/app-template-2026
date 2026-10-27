import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import DocsSearchDialog from "@/components/search";
import "./global.css";

export const metadata = {
  title: { default: "myapp", template: "%s | myapp" },
  description:
    "Use myapp, and build it: the web, desktop, CLI, MCP, Agent Skill and API docs.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider
          search={{ SearchDialog: DocsSearchDialog }}
          // @myapp/tokens' dark colors key off `data-theme`, not the `.dark` class
          // Fumadocs' own compiled CSS uses; setting both from one next-themes instance
          // keeps them in sync instead of forking dark-mode logic in two places.
          theme={{ attribute: ["class", "data-theme"] }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
