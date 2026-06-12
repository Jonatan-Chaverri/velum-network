import { DashboardTopbar } from "@/components/dashboard/topbar";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { TransactionsTable } from "@/components/dashboard/transactions-table";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Overview"
        description="A live snapshot of your agents, their marketplace presence, and recent on-chain activity."
      />
      <OverviewStats />
      <TransactionsTable limit={5} title="Recent activity" />
    </div>
  );
}
