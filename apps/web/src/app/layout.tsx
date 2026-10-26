import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "myapp",
  description: "myapp web app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
