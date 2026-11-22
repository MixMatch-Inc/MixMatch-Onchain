import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { I18nProvider } from "../lib/i18n";
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
  title: { default: "MixMatch", template: "%s | MixMatch" },
  description: "Meet people through shared taste and pay them instantly over Stellar.",
  openGraph: {
    title: "MixMatch",
    description: "Meet people through shared taste and pay them instantly over Stellar.",
    type: "website",
  },
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
        <I18nProvider>{children}</I18nProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
