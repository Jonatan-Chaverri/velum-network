"use client";

import { useEffect, useState } from "react";

import { AgentCard } from "@/components/dashboard/agent-card";
import type { Agent } from "@/lib/data/agents";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function MarketplaceList() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/marketplace`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
          throw new Error(
            (data && typeof data.error === "string" && data.error) ||
              "Failed to load marketplace.",
          );
        }
        if (!cancelled) {
          setAgents(Array.isArray(data.agents) ? (data.agents as Agent[]) : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load marketplace.",
          );
          setAgents([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (agents === null) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-400">
        Loading marketplace…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 p-8 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-400">
        No services are available in the marketplace yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
