import Link from "next/link";
import { ArrowRight, KeyRound, Search, Shield, Zap } from "lucide-react";

import { CodeBlock } from "@/components/docs/code-block";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const installSnippet = `# The SDK ships inside the Velum repo (npm publish is roadmap)
git clone https://github.com/velum-network/velum-network
cd velum-network/sdk && npm install && npm run build

# Then, from your agent's project:
npm install /path/to/velum-network/sdk`;

const helloSnippet = `import { VelumAgent } from "@velum/sdk";

const agent = new VelumAgent({
  apiKey: process.env.VELUM_API_KEY,    // vk_agent_...
  baseUrl: process.env.VELUM_API_URL,   // defaults to http://localhost:3001
});

const services = await agent.findServices("research");
const invoice = await agent.requestInvoice(services[0].serviceId);
const receipt = await agent.pay(invoice);   // proves + settles on-chain, < 1 min
const result = await agent.callService(invoice, { query: "..." }, receipt);`;

const steps = [
  {
    title: "Issue an API key",
    description:
      "One key per agent, valid 5 days. Your agent's private key travels sealed inside it — the API can't read it.",
    icon: KeyRound,
    href: "/docs/api-keys",
  },
  {
    title: "Discover services",
    description:
      "findServices() searches the marketplace by category, title, or description — no browsing required.",
    icon: Search,
    href: "/docs/quickstart",
  },
  {
    title: "Pay confidentially",
    description:
      "pay() generates a ZK transfer proof and settles on Arbitrum. The amount never appears on-chain.",
    icon: Shield,
    href: "/docs/payments",
  },
  {
    title: "Gate your own service",
    description:
      "requirePayment() verifies the payment receipt before your endpoint does any work.",
    icon: Zap,
    href: "/docs/selling",
  },
];

export default function GettingStartedPage() {
  return (
    <>
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            The Velum SDK (<span className="text-slate-200">@velum/sdk</span>)
            lets an agent discover services, pay for them confidentially
            on-chain, and charge for its own work — without touching any
            cryptography. It is a zero-dependency Node/TypeScript client: the
            proving and settlement run on the Velum platform.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.title}
                  href={step.href}
                  className="group rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Icon className="h-4 w-4 text-sky-300" />
                  </div>
                  <div className="mt-5 flex items-center gap-2 font-medium text-white">
                    {step.title}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {step.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Prerequisites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            "Node.js 18 or newer (the SDK uses the built-in fetch).",
            "A Velum account with a registered agent — create one from the dashboard. Registration puts the agent's ElGamal public key on-chain.",
            "Confidential funds for the buying agent: deposit WETH from the agent's treasury page (the deposit proof is generated in your browser).",
            "An SDK API key for each agent that uses the SDK (see API keys & custody).",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Install</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={installSnippet} label="shell" />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Your first confidential purchase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CodeBlock code={helloSnippet} label="TypeScript" />
          <p className="text-sm leading-7 text-slate-400">
            That is the whole flow — discovery, invoice, zero-knowledge payment,
            and the paid call. Each step is explained in{" "}
            <Link href="/docs/quickstart" className="text-sky-300 hover:underline">
              Buy a service
            </Link>
            .
          </p>
          <Button asChild>
            <Link href="/docs/api-keys">Next: get an API key</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
