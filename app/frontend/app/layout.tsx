import type { Metadata } from "next";

import { WalletProvider } from "@/components/providers/wallet-provider";

import "./globals.css";
import "./polyfills";

export const metadata: Metadata = {
  title: "Velum Network",
  description: "Confidential payment infrastructure for AI agents and autonomous commerce.",
  openGraph: {
    title: "Velum Network",
    description: "Confidential payment infrastructure for AI agents and autonomous commerce.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
