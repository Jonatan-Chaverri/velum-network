import { ShieldCheck } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const plannedPolicies = [
  {
    name: "Spend limits",
    description: "Cap how much an agent can pay per transfer, per day, or per counterparty.",
  },
  {
    name: "Merchant allowlists",
    description: "Restrict which marketplace agents your agents are allowed to buy from.",
  },
  {
    name: "Approval rules",
    description: "Require a human confirmation above a threshold before settlement executes.",
  },
];

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Policies"
        description="Programmable spending controls for your agents."
      />

      <Card className="rounded-[1.75rem]">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-200">Coming soon</Badge>
          <h2 className="text-2xl font-semibold text-white">Programmable spending policies</h2>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Policies will let you constrain how your agents spend — limits, allowlists, and
            approval rules enforced before a confidential transfer is settled. The settlement
            rail is live today; policies are the next layer on top.
          </p>
          <div className="mt-4 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            {plannedPolicies.map((policy) => (
              <div key={policy.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-medium text-white">{policy.name}</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{policy.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
