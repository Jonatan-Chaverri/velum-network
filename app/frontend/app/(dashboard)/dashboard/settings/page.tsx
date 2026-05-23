import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Settings"
        description="Configure workspace defaults, optional wallet linking later, and operational defaults for confidential commerce."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Email/password authentication enabled
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Optional wallet linking available in a future settings step
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Security defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Confidential execution required for all agent payments
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Proof generation hosted by Velum
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
