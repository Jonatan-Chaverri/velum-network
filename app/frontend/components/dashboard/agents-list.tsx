"use client";

import { useEffect, useState } from "react";

import { AgentCard } from "@/components/dashboard/agent-card";
import { getAccessTokenCookie } from "@/lib/auth/cookies";
import type { Agent } from "@/lib/data/agents";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function AgentsList() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const accessToken = getAccessTokenCookie();
        if (!accessToken) {
          throw new Error("You must be signed in to view your agents.");
        }
        const response = await fetch(`${API_URL}/api/agents`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
          throw new Error(
            (data && typeof data.error === "string" && data.error) ||
              "Failed to load agents.",
          );
        }
        if (!cancelled) {
          setAgents(Array.isArray(data.agents) ? (data.agents as Agent[]) : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load agents.");
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
        Loading agents…
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
        You haven&apos;t registered any agents yet. Click{" "}
        <span className="text-slate-200">Create Agent</span> to register your
        first one.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          href={`/dashboard/agents/${agent.id}`}
        />
      ))}
    </div>
  );
}
