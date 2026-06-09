import { CreateAgentForm } from "@/components/dashboard/create-agent-form";
import { AgentsWalletWarning } from "@/components/dashboard/agents-wallet-warning";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default function CreateAgentPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Create Agent"
        description="Set identity, treasury controls, and payment boundaries before issuing confidential execution access."
      />
      <AgentsWalletWarning />
      <CreateAgentForm />
    </div>
  );
}
