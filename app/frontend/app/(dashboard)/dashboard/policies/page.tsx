import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { policies } from "@/lib/data/mock";

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Policies"
        description="Control how agents spend, which counterparties they can access, and when confidential transfers require review."
      />
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Programmable spending policies</CardTitle>
            <Button>New policy</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {policies.map((policy) => (
            <div
              key={policy.name}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-medium text-white">{policy.name}</div>
                  <div className="mt-2 text-sm text-slate-400">Scope: {policy.scope}</div>
                  <div className="mt-1 text-sm text-slate-400">Limit: {policy.limit}</div>
                </div>
                <Badge>{policy.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
