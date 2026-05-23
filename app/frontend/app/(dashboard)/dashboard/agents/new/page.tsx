import { CreateAgentForm } from "@/components/dashboard/create-agent-form";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default function CreateAgentPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Create Agent"
        description="Set identity, treasury controls, and payment boundaries before issuing confidential execution access."
      />
      <CreateAgentForm />
    </div>
  );
}
