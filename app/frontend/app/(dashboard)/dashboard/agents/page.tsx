import { Plus } from "lucide-react";

import { AgentsList } from "@/components/dashboard/agents-list";
import {
  AgentsWalletWarning,
  CreateAgentButton,
} from "@/components/dashboard/agents-wallet-warning";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Agents"
        description="Provision private treasuries, issue execution credentials, and control how autonomous systems can spend."
      />
      <AgentsWalletWarning />
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-slate-400" />
          <CreateAgentButton />
        </div>
      </div>
      <AgentsList />
    </div>
  );
}
