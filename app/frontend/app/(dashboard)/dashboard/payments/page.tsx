import { DashboardTopbar } from "@/components/dashboard/topbar";
import { PaymentModal } from "@/components/dashboard/payment-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const paymentStates = [
  "Generating proof...",
  "Verifying transaction...",
  "Executing confidential transfer...",
  "Confidential payment completed",
];

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Payments"
        description="Confidential settlement flows for agent-to-agent commerce, procurement, and treasury disbursement."
      />
      <div className="flex justify-end">
        <PaymentModal />
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Execution flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentStates.map((state, index) => (
              <div
                key={state}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-white">{state}</span>
                  <Badge>0{index + 1}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Payment controls</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Select recipient agent
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Amount and token
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Metadata and purchase context
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              Confirm confidential payment
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
