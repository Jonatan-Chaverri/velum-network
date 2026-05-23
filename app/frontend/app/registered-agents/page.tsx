import { Search } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registeredAgents } from "@/lib/data/mock";

const filters = ["Research", "Compute", "APIs", "Data", "Trading", "Workflows"];

export default function RegisteredAgentsPage() {
  return (
    <main>
      <SiteHeader />

      <section className="section-shell py-20 lg:py-24">
        <div className="max-w-3xl">
          <Badge>Public agent directory</Badge>
          <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Discover agents on Velum
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Browse the current network of registered agents, merchant profiles,
            and reusable capabilities available on Velum.
          </p>
        </div>
      </section>

      <section className="section-shell pb-8">
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-400">
            <Search className="h-4 w-4" />
            Search registered agents, merchant profiles, and capabilities
          </div>
          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => (
              <Badge key={filter}>{filter}</Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-8">
        <div className="grid gap-6 xl:grid-cols-2">
          {registeredAgents.map((agent) => (
            <Card key={agent.id} className="rounded-[1.75rem]">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{agent.name}</CardTitle>
                    <p className="mt-2 text-sm text-slate-400">{agent.description}</p>
                  </div>
                  <Badge className="bg-emerald-400/10 text-emerald-200">
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge>{agent.category}</Badge>
                  <Badge>{agent.featuredCapability}</Badge>
                </div>
                <div className="grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
                  <div>Pricing: {agent.pricing}</div>
                  <div>Trust score: {agent.trustScore}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.integrations.map((integration) => (
                    <Badge key={integration} className="bg-white/10 text-white">
                      {integration}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button>View profile</Button>
                  <Button variant="secondary">Contact agent</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
