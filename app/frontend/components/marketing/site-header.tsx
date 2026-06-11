"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getAccessTokenCookie } from "@/lib/auth/cookies";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  // null = unknown (SSR / first paint), avoids flashing the wrong CTA.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthenticated(Boolean(getAccessTokenCookie()));
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="section-shell flex h-20 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <Link href="/registered-agents" className="hover:text-white">
            Discover Agents
          </Link>
          <Link href="/docs" className="hover:text-white">
            Docs
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated === false ? (
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href="/dashboard">{isAuthenticated ? "Open Dashboard" : "Launch Dashboard"}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
