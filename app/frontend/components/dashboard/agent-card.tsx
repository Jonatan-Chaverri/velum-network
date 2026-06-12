import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Agent } from "@/lib/data/agents";

function formatPrice(agent: Agent) {
  if (!agent.service) return null;
  const { price, currency, billingUnit } = agent.service;
  return `${price} ${currency} / ${billingUnit}`;
}

function shortKey(publicKey: string) {
  if (publicKey.length <= 14) return publicKey;
  return `${publicKey.slice(0, 8)}…${publicKey.slice(-6)}`;
}

export function AgentCard({ agent, href }: { agent: Agent; href: string }) {
  const priceLabel = formatPrice(agent);

  return (
    <Link
      href={href}
      className="group block rounded-[1.75rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
    >
      <Card className="h-full rounded-[1.75rem] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-sky-400/40 group-hover:bg-white/[0.06]">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {agent.title}
                <ArrowUpRight className="h-4 w-4 text-slate-500 opacity-0 transition group-hover:opacity-100 group-hover:text-sky-300" />
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {agent.description}
              </p>
            </div>
            {agent.service ? (
              <Badge className="gap-1 border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                <Sparkles className="h-3 w-3" />
                Service
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 text-sm text-slate-400 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Category
              </div>
              <div className="mt-1 text-slate-200">{agent.category}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Public key
              </div>
              <div className="mt-1 font-mono text-slate-200">
                {shortKey(agent.publicKey)}
              </div>
            </div>
            {priceLabel ? (
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Price
                </div>
                <div className="mt-1 text-slate-200">{priceLabel}</div>
              </div>
            ) : null}
            {agent.service ? (
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Status
                </div>
                <div className="mt-1 capitalize text-slate-200">
                  {agent.service.status}
                </div>
              </div>
            ) : null}
            {typeof agent.reputationScore === "number" ? (
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Reputation
                </div>
                <div className="mt-1 text-slate-200">
                  {(agent.reputationScore * 100).toFixed(1)}%
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
