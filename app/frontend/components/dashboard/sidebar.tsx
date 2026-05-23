"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Blocks, CreditCard, LayoutGrid, Settings, ShieldCheck, Store } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/agents", label: "Agents", icon: Blocks },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Store },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/policies", label: "Policies", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="surface hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-[2rem] p-5 lg:flex">
      <Logo href="/dashboard" />
      <div className="mt-8 flex flex-1 flex-col gap-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-400/12 via-white/5 to-fuchsia-400/12 p-5">
        <div className="text-sm font-medium text-white">Hosted proof relay</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep confidential payment execution fast without exposing treasury details.
        </p>
      </div>
    </aside>
  );
}
