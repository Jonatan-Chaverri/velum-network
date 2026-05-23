import Link from "next/link";
import { BookOpen, FileCode2, Layers3, Shield, Sparkles } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  "Getting started",
  "TypeScript SDK",
  "Marketplace search",
  "Purchasing services",
  "Merchant profiles",
  "Confidential payments",
];

const quickstartSteps = [
  {
    title: "Create a Velum client",
    description: "Initialize the SDK in your agent runtime or local workflow.",
    icon: FileCode2,
  },
  {
    title: "Search the marketplace",
    description: "Discover agents, APIs, compute, and workflows programmatically.",
    icon: Layers3,
  },
  {
    title: "Execute a purchase",
    description: "Apply budgets and rules, then let your agent buy what it needs.",
    icon: Sparkles,
  },
  {
    title: "Keep transactions private",
    description: "Use Velum's confidential payment flow without exposing balances or transfer amounts publicly.",
    icon: Shield,
  },
];

const sdkSnippet = `import { VelumClient } from "@velum/sdk";

const velum = new VelumClient({
  apiKey: process.env.VELUM_API_KEY,
});

const listings = await velum.marketplace.search({
  query: "compute api",
  category: "Compute",
});

await velum.payments.purchase({
  agentId: "ops-agent",
  listingId: listings[0].id,
  maxAmount: 25,
});`;

export default function DocsPage() {
  return (
    <main>
      <SiteHeader />

      <section className="section-shell py-20 lg:py-24">
        <div className="max-w-3xl">
          <Badge>Documentation</Badge>
          <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Build with Velum
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Docs for integrating the Velum marketplace, payments, and agent
            commerce flows into your own applications. This is a starter docs
            surface for now, with mock structure ready to expand.
          </p>
        </div>
      </section>

      <section className="section-shell pb-20">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="surface h-fit rounded-[1.75rem] p-5">
            <div className="flex items-center gap-3 text-sm font-medium text-white">
              <BookOpen className="h-4 w-4 text-sky-300" />
              Documentation
            </div>
            <div className="mt-6 space-y-2">
              {navItems.map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    index === 0
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            <Card className="rounded-[1.75rem]">
              <CardHeader>
                <CardTitle>Getting started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="max-w-3xl text-sm leading-7 text-slate-400">
                  Velum gives your agents a way to discover services, execute
                  purchases, and keep balances and transfer amounts private. The
                  docs structure below is intentionally lightweight for now, but
                  it mirrors the core developer journey we’ll likely expand.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {quickstartSteps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.title}
                        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                          <Icon className="h-4 w-4 text-sky-300" />
                        </div>
                        <div className="mt-5 font-medium text-white">{step.title}</div>
                        <p className="mt-2 text-sm leading-7 text-slate-400">
                          {step.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem]">
              <CardHeader>
                <CardTitle>Quickstart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-5">
                  <pre className="overflow-x-auto text-sm leading-7 text-slate-300">
                    <code>{sdkSnippet}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem]">
              <CardHeader>
                <CardTitle>What’s next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "Marketplace search endpoints and query filters",
                  "Merchant profile registration and service publishing",
                  "Budget policies and confidential purchase flows",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
                <div className="pt-2">
                  <Button asChild>
                    <Link href="/dashboard">Open dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
