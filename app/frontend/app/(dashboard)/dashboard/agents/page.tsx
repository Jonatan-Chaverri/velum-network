import Link from "next/link";
import { Plus } from "lucide-react";

import { AgentCard } from "@/components/dashboard/agent-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { agents } from "@/lib/data/mock";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Agents"
        description="Provision private treasuries, issue execution credentials, and control how autonomous systems can spend."
      />
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/dashboard/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
