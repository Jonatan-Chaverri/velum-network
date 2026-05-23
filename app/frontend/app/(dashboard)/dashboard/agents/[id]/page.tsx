import { notFound } from "next/navigation";

import { ApiKeyPanel } from "@/components/dashboard/api-key-panel";
import { ActivityTable } from "@/components/dashboard/activity-table";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agents, policies } from "@/lib/data/mock";

export default async function AgentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = agents.find((entry) => entry.id === id);

  if (!agent) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <DashboardTopbar
        title={agent.name}
        description={agent.description}
      />
      <div className="grid gap-6 xl:grid-cols-4">
        {[
          ["Encrypted balance", agent.encryptedBalance],
          ["Monthly spend", agent.monthlySpend],
          ["Proof generation count", agent.proofGenerationCount],
          ["Active API keys", String(agent.activeApiKeys)],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-[1.75rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-white">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Spending policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {policies.map((policy) => (
              <div
                key={policy.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-white">{policy.name}</div>
                  <Badge>{policy.status}</Badge>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  <div>Scope: {policy.scope}</div>
                  <div>Limit: {policy.limit}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <ApiKeyPanel />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Merchant settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Confidential checkout enabled for marketplace purchases
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Recipient allowlist synchronized with spending policy engine
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Confidential treasury</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Hosted proof generation active
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Privacy-preserving transfer routing enabled
            </div>
          </CardContent>
        </Card>
      </div>
      <ActivityTable />
    </div>
  );
}
