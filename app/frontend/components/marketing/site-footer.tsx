import Link from "next/link";

import { Logo } from "@/components/shared/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="section-shell flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <Logo />
        <div className="flex flex-wrap gap-5 text-sm text-slate-400">
          <Link href="/docs" className="hover:text-white">
            Docs
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
          <Link href="#" className="hover:text-white">
            GitHub
          </Link>
          <Link href="#" className="hover:text-white">
            X/Twitter
          </Link>
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
