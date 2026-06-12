"use client";

import { EarningsSummary } from "@/components/dashboard/earnings-summary";
import { TransactionsTableView } from "@/components/dashboard/transactions-table";
import { useTransactions } from "@/lib/hooks/use-transactions";

export function TransactionsView() {
  const { transactions, error } = useTransactions();

  return (
    <div className="space-y-6">
      <EarningsSummary transactions={transactions} />
      <TransactionsTableView transactions={transactions} error={error} />
    </div>
  );
}
