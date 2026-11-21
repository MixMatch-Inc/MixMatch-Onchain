import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { themeInitScript, tokensCss } from "@mixmatch/tokens";
import { ThemeProvider } from "../lib/theme";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: { default: "MixMatch Onchain", template: "%s | MixMatch" },
  description: "Match, chat and pay on Stellar.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Design tokens as CSS variables, and the saved theme applied before first paint. */}
        <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
