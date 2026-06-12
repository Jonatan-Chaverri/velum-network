"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Globe, ShieldCheck, Sparkles } from "lucide-react";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Agent } from "@/lib/data/agents";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type MarketplaceAgent = Agent & {
  reputation: { successResponses: number; totalRequests: number } | null;
};

export default function MarketplaceServicePage() {
  const params = useParams<{ id: string }>();
  const [agent, setAgent] = useState<MarketplaceAgent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/marketplace/${params.id}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          agent?: MarketplaceAgent;
        };

        if (!response.ok || !data.success || !data.agent) {
          throw new Error(data.error || "This service is not available.");
        }

        if (!cancelled) {
          setAgent(data.agent);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "This service is not available.",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (!agent && !error) {
    return (
      <div className="space-y-6">
        <DashboardTopbar
          title="Loading service"
          description="Fetching the latest details for this marketplace service."
        />
        <div className="h-64 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.03]" />
      </div>
    );
  }

  if (error || !agent || !agent.service) {
    return (
      <div className="space-y-6">
        <DashboardTopbar
          title="Service unavailable"
          description="We couldn't load this marketplace service."
        />
        <div className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 p-8 text-sm text-rose-200">
          {error || "Service not found."}
        </div>
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-2 text-sm text-sky-300 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </div>
    );
  }

  const { service, reputation } = agent;
  const successRate =
    reputation && reputation.totalRequests > 0
      ? `${((reputation.successResponses / reputation.totalRequests) * 100).toFixed(1)}%`
      : null;

  return (
    <div className="space-y-6">
      <DashboardTopbar title={agent.title} description={agent.description} />

      <Link
        href="/dashboard/marketplace"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <Card className="rounded-[1.75rem]">
        <CardHeader className="border-b border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Service offering</CardTitle>
                <p className="mt-1 text-sm text-slate-400">
                  What this agent sells and how it charges for it.
                </p>
              </div>
            </div>
            <Badge>{agent.category}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Price
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-white">
                {service.price}
                <span className="ml-2 text-lg font-normal text-slate-400">
                  {service.currency} / {service.billingUnit}
                </span>
              </div>
            </div>
            {successRate ? (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-xs uppercase tracking-wide text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" /> Success rate
                </div>
                <div className="mt-1 text-2xl font-semibold text-emerald-200">
                  {successRate}
                </div>
                <div className="text-xs text-slate-500">
                  {reputation!.successResponses} of {reputation!.totalRequests} requests
                </div>
              </div>
            ) : (
              <div className="text-right text-sm text-slate-500">
                No reputation data yet
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Pricing model
              </div>
              <div className="mt-1 capitalize text-slate-200">
                {service.pricingModel.replace("_", " ")}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Listed since
              </div>
              <div className="mt-1 text-slate-200">
                {new Date(service.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
                <Globe className="h-3.5 w-3.5" /> Service endpoint
              </div>
              <div className="mt-1 break-all font-mono text-xs leading-5 text-slate-200">
                {service.endpointUrl}
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-400">
            Payments to this agent settle confidentially on-chain. Use the{" "}
            <Link
              href="/docs"
              className="text-sky-300 underline-offset-4 hover:underline"
            >
              Velum SDK
            </Link>{" "}
            or a confidential payment from the Transactions page to purchase from it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
