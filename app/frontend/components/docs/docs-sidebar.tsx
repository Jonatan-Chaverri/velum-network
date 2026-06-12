"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

const sections = [
  { href: "/docs", label: "Getting started" },
  { href: "/docs/api-keys", label: "API keys & custody" },
  { href: "/docs/quickstart", label: "Buy a service" },
  { href: "/docs/selling", label: "Sell a service" },
  { href: "/docs/payments", label: "How payments work" },
  { href: "/docs/reference", label: "API reference" },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="surface h-fit rounded-[1.75rem] p-5 lg:sticky lg:top-28">
      <div className="flex items-center gap-3 text-sm font-medium text-white">
        <BookOpen className="h-4 w-4 text-sky-300" />
        Documentation
      </div>
      <nav className="mt-6 space-y-2">
        {sections.map((section) => {
          const isActive = pathname === section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`block rounded-2xl px-4 py-3 text-sm transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
