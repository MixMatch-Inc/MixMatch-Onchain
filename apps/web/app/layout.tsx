import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TheMixMatch Onchain Starter",
  description: "A clean hackathon starter for web, mobile, API, and Stellar services."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
