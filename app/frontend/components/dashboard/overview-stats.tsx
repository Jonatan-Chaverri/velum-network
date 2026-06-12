"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { StatCard } from "@/components/dashboard/stat-card";
import { getAccessTokenCookie } from "@/lib/auth/cookies";
import type { Agent } from "@/lib/data/agents";
import type { TransactionRecord } from "@/lib/data/transactions";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type OverviewData = {
  agentCount: number;
  serviceCount: number;
  marketplaceCount: number;
  transactionCount: number;
};

export function OverviewStats() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const accessToken = getAccessTokenCookie();
        if (!accessToken) {
          throw new Error("You must be signed in to view your overview.");
        }

        const authHeaders = { Authorization: `Bearer ${accessToken}` };
        const [agentsResponse, marketplaceResponse, transactionsResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/agents`, { headers: authHeaders, cache: "no-store" }),
            fetch(`${API_URL}/api/marketplace`, { cache: "no-store" }),
            fetch(`${API_URL}/api/transaction`, { headers: authHeaders, cache: "no-store" }),
          ]);

        const [agentsData, marketplaceData, transactionsData] = await Promise.all([
          agentsResponse.json().catch(() => ({})),
          marketplaceResponse.json().catch(() => ({})),
          transactionsResponse.json().catch(() => ({})),
        ]);

        if (!agentsResponse.ok || !agentsData?.success) {
          throw new Error(
            (typeof agentsData?.error === "string" && agentsData.error) ||
              "Failed to load your agents.",
          );
        }

        const agents: Agent[] = Array.isArray(agentsData.agents) ? agentsData.agents : [];
        const marketplace: Agent[] = Array.isArray(marketplaceData?.agents)
          ? marketplaceData.agents
          : [];
        const transactions: TransactionRecord[] = Array.isArray(
          transactionsData?.transactions,
        )
          ? transactionsData.transactions
          : [];

        if (!cancelled) {
          setData({
            agentCount: agents.length,
            serviceCount: agents.filter((agent) => agent.service).length,
            marketplaceCount: marketplace.length,
            transactionCount: transactions.length,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load your overview.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 p-8 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-6 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
    );
  }

  if (data.agentCount === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-8 text-sm leading-7 text-slate-400">
        You don&apos;t have any agents yet.{" "}
        <Link
          href="/dashboard/agents/new"
          className="text-sky-300 underline-offset-4 hover:underline"
        >
          Create your first agent
        </Link>{" "}
        to give it a confidential on-chain treasury, then fund it and let it pay other
        agents — or sell a service of its own in the marketplace.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      <StatCard
        title="Your agents"
        value={String(data.agentCount)}
        description="Agents registered from this account"
      />
      <StatCard
        title="Selling services"
        value={String(data.serviceCount)}
        description="Your agents with a marketplace listing"
      />
      <StatCard
        title="Marketplace services"
        value={String(data.marketplaceCount)}
        description="Services currently available to buy"
      />
      <StatCard
        title="Transactions"
        value={String(data.transactionCount)}
        description="Deposits, transfers, and withdrawals"
      />
    </div>
  );
}
