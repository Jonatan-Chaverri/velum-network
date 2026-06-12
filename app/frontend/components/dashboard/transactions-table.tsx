"use client";

import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  transactionDirection,
  type TransactionParty,
  type TransactionRecord,
} from "@/lib/data/transactions";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { formatWeiAmount } from "@/lib/utils/format-amount";

const EXPLORER_TX_URL = "https://sepolia.arbiscan.io/tx";
const TOKEN_SYMBOL = "WETH";

const typeMeta = {
  deposit: { label: "Deposit", icon: ArrowDownToLine, className: "text-emerald-300" },
  transfer: { label: "Transfer", icon: ArrowRightLeft, className: "text-sky-300" },
  withdraw: { label: "Withdraw", icon: ArrowUpFromLine, className: "text-fuchsia-300" },
} as const;

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function PartyLabel({
  party,
  wallet,
}: {
  party: TransactionParty | null;
  wallet: string | null;
}) {
  if (party) {
    return (
      <span className={party.isMine ? "text-white" : "text-slate-300"}>
        {party.title}
        {party.isMine ? (
          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-sky-300">
            yours
          </span>
        ) : null}
      </span>
    );
  }

  if (wallet) {
    return <span className="font-mono text-xs text-slate-400">{shortWallet(wallet)}</span>;
  }

  return <span className="text-slate-500">—</span>;
}

function AmountCell({ transaction }: { transaction: TransactionRecord }) {
  const formatted = formatWeiAmount(transaction.amount);

  if (!formatted) {
    return <span className="text-slate-500">—</span>;
  }

  const direction = transactionDirection(transaction);
  const sign = direction === "in" ? "+" : direction === "out" ? "−" : "";
  const className =
    direction === "in"
      ? "text-emerald-300"
      : direction === "out"
        ? "text-rose-300"
        : "text-slate-300";

  return (
    <span className={`whitespace-nowrap font-medium ${className}`}>
      {sign}
      {formatted}
      <span className="ml-1 text-xs font-normal text-slate-500">{TOKEN_SYMBOL}</span>
    </span>
  );
}

export function TransactionsTableView({
  transactions,
  error,
  limit,
  title = "Transactions",
}: {
  transactions: TransactionRecord[] | null;
  error: string | null;
  limit?: number;
  title?: string;
}) {
  const visible = limit && transactions ? transactions.slice(0, limit) : transactions;

  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <Badge className="border-white/10 bg-white/5 text-slate-300">
            Amounts visible only to you
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {visible === null ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
            Loading transactions…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
            No transactions yet. Once your agents deposit, pay, or get paid, the
            activity shows up here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">From</th>
                  <th className="pb-3 pr-4 font-medium">To</th>
                  <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">When</th>
                  <th className="pb-3 font-medium">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((transaction) => {
                  const meta = typeMeta[transaction.type] ?? typeMeta.transfer;
                  const Icon = meta.icon;
                  return (
                    <tr
                      key={transaction.id}
                      className="border-t border-white/5 text-slate-300"
                    >
                      <td className="py-3.5 pr-4">
                        <span className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${meta.className}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <PartyLabel
                          party={transaction.senderAgent}
                          wallet={
                            transaction.type === "deposit"
                              ? transaction.associatedWallet
                              : null
                          }
                        />
                      </td>
                      <td className="py-3.5 pr-4">
                        <PartyLabel
                          party={transaction.receiverAgent}
                          wallet={
                            transaction.type === "withdraw"
                              ? transaction.associatedWallet
                              : null
                          }
                        />
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <AmountCell transaction={transaction} />
                      </td>
                      <td className="py-3.5 pr-4 text-slate-400">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        <a
                          href={`${EXPLORER_TX_URL}/${transaction.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-sky-300 underline-offset-4 hover:underline"
                        >
                          {transaction.txHash.slice(0, 10)}…
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TransactionsTable({
  limit,
  title,
}: {
  limit?: number;
  title?: string;
}) {
  const { transactions, error } = useTransactions();

  return (
    <TransactionsTableView
      transactions={transactions}
      error={error}
      limit={limit}
      title={title}
    />
  );
}
