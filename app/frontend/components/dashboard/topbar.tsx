import { Bell, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function DashboardTopbar({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <Badge>Confidential AI commerce</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-400">
          <Search className="h-4 w-4" />
          Search agents, policies, counterparties
        </div>
        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:text-white">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
