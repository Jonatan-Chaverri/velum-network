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
          <Link
            href="https://github.com/Jonatan-Chaverri/velum-network"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
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
      <div className="section-shell mt-6 flex items-center gap-2 text-xs text-slate-500">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Live demo on Arbitrum Sepolia testnet — not yet on mainnet, no real funds at stake.
      </div>
    </footer>
  );
}
