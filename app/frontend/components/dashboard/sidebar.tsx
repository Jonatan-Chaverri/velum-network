"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Blocks,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  Store,
} from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { clearSessionCookies } from "@/lib/auth/cookies";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/agents", label: "Agents", icon: Blocks },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Store },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/dashboard/policies", label: "Policies", icon: ShieldCheck, badge: "Soon" },
  { href: "/dashboard/help", label: "Help", icon: LifeBuoy },
] as Array<{ href: string; label: string; icon: typeof LayoutGrid; badge?: string }>;

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearSessionCookies();
    router.replace("/login");
  }

  return (
    <aside className="surface hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-[2rem] p-5 lg:flex">
      <Logo href="/dashboard" />
      <div className="mt-8 flex flex-1 flex-col gap-2">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="flex-1">Log out</span>
        </button>
      </div>
      <div className="mt-4 rounded-3xl border border-white/10 bg-gradient-to-br from-sky-400/12 via-white/5 to-fuchsia-400/12 p-5">
        <div className="text-sm font-medium text-white">Hosted proof relay</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep confidential payment execution fast without exposing treasury details.
        </p>
      </div>
    </aside>
  );
}
