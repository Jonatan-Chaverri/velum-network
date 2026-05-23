import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Velum Network",
  description: "Confidential payment infrastructure for AI agents and autonomous commerce.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}
