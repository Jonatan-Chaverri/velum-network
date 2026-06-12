"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  transactionDirection,
  type TransactionRecord,
} from "@/lib/data/transactions";
import { formatWeiAmount, weiToNumber } from "@/lib/utils/format-amount";

const TOKEN_SYMBOL = "WETH";

const COLORS = {
  emerald: "#34d399",
  rose: "#fb7185",
  slate: "#64748b",
};

function formatSignedWei(value: bigint) {
  const formatted = formatWeiAmount((value < BigInt(0) ? -value : value).toString()) ?? "0";
  return value < BigInt(0) ? `−${formatted}` : formatted;
}

/** Cumulative net earnings from agent-to-agent payments, oldest first. */
function buildSeries(transactions: TransactionRecord[]) {
  const transfers = transactions
    .filter((transaction) => transaction.type === "transfer" && transaction.amount)
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  let running = 0;
  const points: Array<{ date: Date; value: number }> = [];

  for (const transfer of transfers) {
    const direction = transactionDirection(transfer);
    if (direction === "internal") continue;
    running += (direction === "in" ? 1 : -1) * weiToNumber(transfer.amount);
    points.push({ date: new Date(transfer.createdAt), value: running });
  }

  return points;
}

function ProfitChart({ points }: { points: Array<{ date: Date; value: number }> }) {
  const width = 600;
  const height = 180;
  const pad = { top: 16, right: 16, bottom: 28, left: 16 };

  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const x = (index: number) =>
    points.length === 1
      ? width / 2
      : pad.left + (index / (points.length - 1)) * (width - pad.left - pad.right);
  const y = (value: number) =>
    pad.top + ((maxValue - value) / range) * (height - pad.top - pad.bottom);

  const zeroY = y(0);
  const lineColor = points[points.length - 1].value >= 0 ? COLORS.emerald : COLORS.rose;
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(points.length - 1)},${zeroY} L${x(0)},${zeroY} Z`;

  const dateLabel = (date: Date) =>
    date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Cumulative net earnings over time"
    >
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={zeroY}
        y2={zeroY}
        stroke={COLORS.slate}
        strokeOpacity={0.4}
        strokeDasharray="4 4"
      />
      <path d={areaPath} fill={lineColor} fillOpacity={0.12} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} />
      {points.map((point, index) => (
        <circle
          key={index}
          cx={x(index)}
          cy={y(point.value)}
          r={3}
          fill={lineColor}
        />
      ))}
      <text
        x={pad.left}
        y={height - 8}
        fill={COLORS.slate}
        fontSize={11}
      >
        {dateLabel(points[0].date)}
      </text>
      <text
        x={width - pad.right}
        y={height - 8}
        fill={COLORS.slate}
        fontSize={11}
        textAnchor="end"
      >
        {dateLabel(points[points.length - 1].date)}
      </text>
    </svg>
  );
}

export function EarningsSummary({
  transactions,
}: {
  transactions: TransactionRecord[] | null;
}) {
  if (transactions === null) {
    return (
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
    );
  }

  let earned = BigInt(0);
  let spent = BigInt(0);

  for (const transaction of transactions) {
    if (transaction.type !== "transfer" || !transaction.amount) continue;
    const direction = transactionDirection(transaction);
    if (direction === "in") earned += BigInt(transaction.amount);
    if (direction === "out") spent += BigInt(transaction.amount);
  }

  const net = earned - spent;
  const points = buildSeries(transactions);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-emerald-300">
              +{formatWeiAmount(earned.toString()) ?? "0"}{" "}
              <span className="text-base font-normal text-slate-500">{TOKEN_SYMBOL}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Payments your agents received for services
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-rose-300">
              −{formatWeiAmount(spent.toString()) ?? "0"}{" "}
              <span className="text-base font-normal text-slate-500">{TOKEN_SYMBOL}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Payments your agents made to other agents
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Net profit</CardTitle>
              {net >= BigInt(0) ? (
                <TrendingUp className="h-4 w-4 text-emerald-300" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-300" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-semibold ${
                net >= BigInt(0) ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {formatSignedWei(net)}{" "}
              <span className="text-base font-normal text-slate-500">{TOKEN_SYMBOL}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Earned minus spent across all your agents
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Profit over time</CardTitle>
          <p className="text-sm text-slate-400">
            Cumulative net earnings from agent-to-agent payments. Deposits and
            withdrawals move your own funds, so they&apos;re not counted.
          </p>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
              No agent-to-agent payments yet — the chart starts with the first sale
              or purchase.
            </div>
          ) : (
            <ProfitChart points={points} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
