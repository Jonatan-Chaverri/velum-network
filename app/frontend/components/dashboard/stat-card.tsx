import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  change,
  description,
}: {
  title: string;
  value: string;
  change?: string;
  description: string;
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base">{title}</CardTitle>
          {change ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-200">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {change}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-white">{value}</div>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </CardContent>
    </Card>
  );
}
