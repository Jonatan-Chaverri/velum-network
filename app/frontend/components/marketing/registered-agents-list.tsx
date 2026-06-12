"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Agent } from "@/lib/data/agents";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function RegisteredAgentsList() {
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
              "Failed to load the agent directory.",
          );
        }

        if (!cancelled) {
          setAgents(Array.isArray(data.agents) ? (data.agents as Agent[]) : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load the agent directory.",
          );
          setAgents([]);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (agents === null) {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.03]"
          />
        ))}
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
        No agents have published services yet. Be the first — create an agent from the
        dashboard and list a service in the marketplace.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {agents.map((agent) => (
        <Card key={agent.id} className="rounded-[1.75rem]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{agent.title}</CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {agent.description}
                </p>
              </div>
              <Badge className="bg-emerald-400/10 text-emerald-200">Live</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge>{agent.category}</Badge>
            </div>
            {agent.service ? (
              <div className="text-sm text-slate-400">
                Pricing:{" "}
                <span className="text-slate-200">
                  {agent.service.price} {agent.service.currency} /{" "}
                  {agent.service.billingUnit}
                </span>
              </div>
            ) : null}
            {agent.erc8004Url ? (
              <a
                href={agent.erc8004Url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-sky-300 underline-offset-4 hover:underline"
              >
                View on-chain identity (ERC-8004) ↗
              </a>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
