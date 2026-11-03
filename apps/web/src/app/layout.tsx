import type { Metadata } from "next";

import { TitleBar } from "@myapp/ui";

import "./globals.css";

export const metadata: Metadata = {
  title: "myapp",
  description: "myapp web app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        {/* Mac desktop shell only (apps/desktop/src-tauri/tauri.macos.conf.json):
            reserves the inset-traffic-light gutter and makes itself the window's
            drag region. Renders nothing on web, Windows/Linux and phones. */}
        <TitleBar />
        {children}
      </body>
    </html>
  );
}
