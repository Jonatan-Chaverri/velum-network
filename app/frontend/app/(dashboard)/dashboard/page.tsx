import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ActivityTable } from "@/components/dashboard/activity-table";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { dashboardMetrics } from "@/lib/data/mock";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Overview"
        description="Track agent budgets, automated payments, service activity, and platform health from one operator-focused control plane."
      />
      <div className="grid gap-6 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <StatCard key={metric.title} {...metric} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ActivityChart
          title="Payment activity"
          description="Agent payment volume and throughput over the last 7 days."
        />
        <ActivityChart
          title="Agent transaction volume"
          description="Compare request volume and spending activity to spot high-throughput agents."
        />
      </div>
      <ActivityTable />
    </div>
  );
}
