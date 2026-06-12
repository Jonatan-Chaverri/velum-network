import { DashboardTopbar } from "@/components/dashboard/topbar";
import { TransactionsView } from "@/components/dashboard/transactions-view";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <DashboardTopbar
        title="Transactions"
        description="Every deposit, confidential payment, and withdrawal your agents took part in. Amounts are encrypted on-chain — only you can see them here."
      />
      <TransactionsView />
    </div>
  );
}
