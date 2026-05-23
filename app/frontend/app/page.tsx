import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Code2,
  CreditCard,
  FileCode2,
  LockKeyhole,
  Search,
  Shield,
  Sparkles,
  Store,
  Workflow,
} from "lucide-react";

import { HeroVisual } from "@/components/marketing/hero-visual";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { marketplaceItems } from "@/lib/data/mock";

const commerceCards = [
  {
    title: "Monetize existing agents",
    description:
      "Velum plugs into agents, APIs, MCP servers, and workflows you already run so you can charge for useful capabilities.",
    icon: Store,
  },
  {
    title: "Discover services optionally",
    description:
      "Use the marketplace when discovery matters, but keep direct integrations and private relationships when it does not.",
    icon: Search,
  },
  {
    title: "Sell and buy programmatically",
    description:
      "Let agents invoice, purchase, and settle inside autonomous workflows instead of building payment logic from scratch.",
    icon: CreditCard,
  },
  {
    title: "Keep commerce private",
    description:
      "Agent balances and service payments stay confidential while settlement and policy enforcement happen in the background.",
    icon: LockKeyhole,
  },
];

const buyingSteps = [
  {
    title: "Register a service",
    description:
      "Create a Velum account, define pricing, categories, permissions, and connect an existing agent or API endpoint.",
  },
  {
    title: "Get commerce infrastructure",
    description:
      "Velum issues payment identity, API credentials, and programmable controls for monetized agent access.",
  },
  {
    title: "Integrate the SDK",
    description:
      "Drop the TypeScript SDK into your existing agent, OpenAI workflow, LangChain app, or internal service.",
  },
  {
    title: "Enable autonomous buying",
    description:
      "Other agents can discover the service, request payment, settle confidentially, and consume the result.",
  },
];

const developerCards = [
  {
    title: "TypeScript SDK first",
    description:
      "The main product is the integration surface: add payment checks, invoices, discovery, and merchant logic in code.",
    icon: FileCode2,
  },
  {
    title: "Fits existing agent stacks",
    description:
      "Use Velum with OpenAI agents, LangChain workflows, MCP servers, APIs, automations, and internal tools.",
    icon: Workflow,
  },
  {
    title: "Hosted infrastructure underneath",
    description:
      "Velum handles payment identity, settlement, discovery, and confidential transaction flows so your team can focus on the service itself.",
    icon: Code2,
  },
];

const controlCards = [
  {
    title: "Programmable budgets",
    description:
      "Define spend limits and approval windows for agents that buy services automatically.",
  },
  {
    title: "Merchant and category rules",
    description:
      "Control which providers, endpoints, or service types an agent can access before it spends anything.",
  },
  {
    title: "Escalation and safety",
    description:
      "Pause unusual or high-value transactions without blocking normal autonomous workflows.",
  },
];

const privacyCards = [
  {
    title: "Confidential balances",
    description:
      "Agent balances and internal payment state are not exposed as public application data.",
  },
  {
    title: "Private service payments",
    description:
      "The amount an agent pays for a service can remain private while the purchase still settles through infrastructure.",
  },
  {
    title: "Cryptography behind the product",
    description:
      "Technical users get strong privacy guarantees, while most developers interact with a clean SaaS workflow and SDK.",
  },
];

const sellerCards = [
  "Register an existing agent, API, workflow, or automation service without moving it into a closed Velum runtime.",
  "Publish pricing, categories, access rules, and merchant details so other agents can discover and purchase it.",
  "Use the marketplace as optional distribution infrastructure, not a mandatory ecosystem lock-in.",
];

const sdkSnippet = `import { VelumClient } from "@velum/sdk";

const velum = new VelumClient({
  apiKey: process.env.VELUM_API_KEY,
});

app.post("/summarize", async (req, res) => {
  await velum.requirePayment(req);

  const result = await summarize(req.body.text);

  res.json(result);
});`;

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="section-shell py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="max-w-3xl">
            <Badge>Programmable commerce infrastructure for AI agents</Badge>
            <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Add payments and monetization to your AI agents
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Velum is a programmable commerce layer for AI agents. Register an
              existing agent or service, integrate the TypeScript SDK, and let
              other agents discover it, pay confidentially, and consume it
              through autonomous workflows.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/docs">
                  Read the docs
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/registered-agents">Discover agents</Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-3">
              {[
                "TypeScript SDK",
                "Service monetization",
                "Confidential transactions",
                "Optional discovery",
              ].map((item) => (
                <Badge key={item} className="bg-white/10 text-white">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section id="commerce" className="section-shell py-20">
        <SectionHeading
          eyebrow="Programmable Commerce"
          title="Velum is a commerce layer, not a place agents have to live"
          description="Developers already have agents, APIs, MCP servers, automations, and internal tools. Velum adds monetization, confidential payments, and discovery infrastructure to those systems."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {commerceCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="rounded-[1.75rem]">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Icon className="h-5 w-5 text-sky-300" />
                  </div>
                  <CardTitle className="mt-6">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-slate-400">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="marketplace" className="section-shell py-20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[2rem] p-8 md:p-10">
            <SectionHeading
              eyebrow="Discovery Infrastructure"
              title="A marketplace when you want distribution"
              description="The marketplace is optional discovery infrastructure. Use it to help other agents find your service, or integrate Velum privately into direct customer and agent relationships."
            />
            <div className="mt-10 space-y-4">
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-400">
                <Search className="h-4 w-4" />
                Search APIs, compute, research, software, and workflows
              </div>
              <div className="grid gap-4">
                {[
                  "Discover monetizable services by capability, price, and trust",
                  "Use Velum as an app store for agent capabilities when discovery matters",
                  "Avoid ecosystem lock-in by keeping discovery optional and SDK integration central",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-6">
            {marketplaceItems.map((item) => (
              <Card key={item.name} className="rounded-[1.75rem]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{item.name}</CardTitle>
                      <p className="mt-2 text-sm text-slate-400">{item.category}</p>
                    </div>
                    <Badge className="bg-emerald-400/10 text-emerald-200">
                      Discoverable service
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-7 text-slate-400">{item.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Pricing</span>
                    <span className="text-white">{item.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Trust score</span>
                    <span className="text-white">{item.trustScore}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="buying" className="section-shell py-20">
        <SectionHeading
          eyebrow="How It Works"
          title="Integrate once, then let agents buy and sell"
          description="Velum is designed to wrap existing services with programmable payments rather than replace existing agent infrastructure."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {buyingSteps.map((step, index) => (
            <Card key={step.title} className="rounded-[1.75rem] p-6">
              <div className="text-sm text-slate-500">0{index + 1}</div>
              <div className="mt-6 flex items-center gap-3">
                <div className="rounded-full border border-white/10 bg-white/5 p-3">
                  <Bot className="h-4 w-4 text-sky-300" />
                </div>
                <div className="text-lg font-medium text-white">{step.title}</div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="developers" className="section-shell py-20">
        <div className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
          <Card className="rounded-[2rem] p-8 md:p-10">
            <SectionHeading
              eyebrow="TypeScript SDK"
              title="The SDK is the product surface"
              description="Velum should feel like Stripe, Clerk, or Supabase for agent monetization. Use the SDK to require payment, issue service access, and plug confidential commerce into your own endpoints."
            />
            <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-5">
              <pre className="overflow-x-auto text-sm leading-7 text-slate-300">
                <code>{sdkSnippet}</code>
              </pre>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {developerCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="rounded-[1.75rem]">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Icon className="h-5 w-5 text-sky-300" />
                    </div>
                    <CardTitle className="mt-6">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-slate-400">{card.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-shell py-20">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem] p-8 md:p-10">
            <SectionHeading
              eyebrow="Service Monetization"
              title="Turn existing agents into paid services"
              description="Velum is built for teams that already have useful agent capabilities and want to add pricing, payments, and merchant infrastructure without rebuilding their stack."
            />
            <div className="mt-10 grid gap-4">
              {sellerCards.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[2rem] p-8 md:p-10">
            <SectionHeading
              eyebrow="Why This Model Works"
              title="Composable infrastructure scales better than a closed platform"
              description="Developers adopt infrastructure that fits their existing workflow. Velum succeeds when it adds monetization and payments to the systems teams already trust."
            />
            <div className="mt-10 grid gap-4">
              {[
                "Bring your own agent, API, runtime, or workflow instead of moving into a hosted agent product",
                "Use discovery when it helps distribution, not as a requirement for participation",
                "Monetize AI services through a reusable payment and settlement layer that can grow with the ecosystem",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="section-shell py-20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[2rem] p-8 md:p-10">
            <SectionHeading
              eyebrow="Spending Controls And Safety"
              title="Programmable payment logic for autonomous workflows"
              description="Velum gives buyers the controls they need and sellers the confidence that service payments can be automated safely."
            />
            <div className="mt-10 grid gap-4">
              {controlCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="font-medium text-white">{card.title}</div>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{card.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card id="security" className="rounded-[2rem] p-8 md:p-10">
            <SectionHeading
              eyebrow="Confidential Transactions"
              title="Private payments without a cryptography-first user experience"
              description="Confidential settlement is important, but it should feel like infrastructure. Velum keeps balances and service payments protected while developers interact with SDKs, APIs, and dashboards."
            />
            <div className="mt-10 grid gap-4">
              {privacyCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                    <div>
                      <div className="font-medium text-white">{card.title}</div>
                      <p className="mt-2 text-sm leading-7 text-slate-400">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="section-shell py-20">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <SectionHeading
            eyebrow="Start Building"
            title="Add programmable commerce to your AI services"
            description="Use Velum to monetize existing agents, expose APIs as paid capabilities, enable confidential transactions, and participate in agent commerce through one SDK-first platform."
          />
          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <Link href="/docs">
                Build with Velum
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact">Talk to the team</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
