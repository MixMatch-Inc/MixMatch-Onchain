import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/auth/auth-context";

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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
