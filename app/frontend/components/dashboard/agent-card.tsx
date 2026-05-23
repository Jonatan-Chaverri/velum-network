import Link from "next/link";
import { KeyRound, PauseCircle, Plus, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentRecord } from "@/lib/data/mock";

export function AgentCard({ agent }: { agent: AgentRecord }) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{agent.name}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-400">{agent.description}</p>
          </div>
          <Badge>{agent.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Encrypted balance
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {agent.encryptedBalance}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              API requests
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {agent.apiRequests}
            </div>
          </div>
        </div>
        <div className="grid gap-4 text-sm text-slate-400 sm:grid-cols-2">
          <div>Spending limit: {agent.spendingLimit}</div>
          <div>Category: {agent.category}</div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" asChild>
            <Link href={`/dashboard/agents/${agent.id}`}>View</Link>
          </Button>
          <Button size="sm" variant="secondary">
            <Wallet className="mr-2 h-4 w-4" />
            Fund
          </Button>
          <Button size="sm" variant="secondary">
            <KeyRound className="mr-2 h-4 w-4" />
            Generate API Key
          </Button>
          <Button size="sm" variant="secondary">
            <PauseCircle className="mr-2 h-4 w-4" />
            Pause
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
