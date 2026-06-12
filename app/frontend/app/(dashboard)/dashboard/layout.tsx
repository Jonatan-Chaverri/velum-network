import type { ReactNode } from "react";
import Link from "next/link";

import { DashboardSessionGuard } from "@/components/auth/dashboard-session-guard";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Badge } from "@/components/ui/badge";

const mobileItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/agents", label: "Agents" },
  { href: "/dashboard/marketplace", label: "Marketplace" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/policies", label: "Policies" },
  { href: "/dashboard/help", label: "Help" },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardSessionGuard>
      <div className="section-shell py-4 lg:py-6">
        <div className="flex gap-6">
          <DashboardSidebar />
          <div className="min-h-screen flex-1 space-y-4">
            <div className="flex gap-3 overflow-x-auto pb-1 lg:hidden">
              {mobileItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Badge className="whitespace-nowrap">{item.label}</Badge>
                </Link>
              ))}
            </div>
            {children}
          </div>
        </div>
      </div>
    </DashboardSessionGuard>
  );
}
