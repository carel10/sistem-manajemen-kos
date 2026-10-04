import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { themeScript } from "@/lib/theme-script";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "manaKos · Sistem manajemen kos", template: "%s · manaKos" },
  description: "Sistem manajemen kos berbasis web untuk pemilik kos di Indonesia.",
  // app/icon.svg and app/apple-icon.png: Next.js generates the <link> tags from these file names.
};

// A meta tag cannot read CSS variables, so these two hex values repeat --background of each theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F8F1" },
    { media: "(prefers-color-scheme: dark)", color: "#10140E" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme and the inline style on <html>
    // before React hydrates, so those attributes differ from the server HTML on purpose.
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-body text-text-primary">
        {children}
      </body>
    </html>
  );
}
