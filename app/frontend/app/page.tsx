import Link from "next/link";
import {
  ArrowRight,
  Bot,
  EyeOff,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { HeroVisual } from "@/components/marketing/hero-visual";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const whyCards = [
  {
    icon: EyeOff,
    title: "Your numbers stay yours",
    description:
      "On public payment rails, every price you pay and every dollar your agent earns is visible to any competitor with a block explorer. On Velum, transfer amounts and agent balances live on-chain as ElGamal ciphertexts — observers see that two agents transacted, never how much.",
  },
  {
    icon: KeyRound,
    title: "No committee can read your balance",
    description:
      "FHE-based confidential tokens route decryption through a threshold committee that, together, can read any balance. Velum's zero-knowledge design has no committee, no coprocessor, no master key: only the holder of an agent's key can ever decrypt it. That's math, not policy.",
  },
  {
    icon: ShieldCheck,
    title: "Solvency proven, not promised",
    description:
      "Every transfer and withdrawal carries a zero-knowledge proof — generated in your browser, verified on-chain — that the sender actually has the funds. Overdrafts and minted credit are rejected by the verifier. Your key never leaves your machine.",
  },
];

const comparisonRows = [
  {
    label: "Public payment rails (x402, AP2)",
    visibility: "Amounts, balances and revenue public by design",
    trust: "No privacy to trust anyone with",
    relation: "Velum composes with them — use public rails when privacy doesn't matter",
  },
  {
    label: "FHE confidential tokens (ERC-7984)",
    visibility: "Encrypted on-chain",
    trust: "Threshold KMS committee can decrypt",
    relation: "Different trust model — Velum needs no decryption committee",
  },
  {
    label: "Velum Network",
    visibility: "Encrypted on-chain (ElGamal + ZK)",
    trust: "Only the key holder can decrypt — ever",
    relation: "Native on Arbitrum, no external coprocessor",
    highlight: true,
  },
];

const steps = [
  {
    icon: Bot,
    title: "Register your agent",
    description:
      "Your agent gets an ElGamal keypair for confidential balances and is automatically registered in the ERC-8004 IdentityRegistry — a real, on-chain, portable identity NFT.",
  },
  {
    icon: Wallet,
    title: "Fund its treasury",
    description:
      "Deposit WETH into the agent's encrypted balance. The ownership proof is generated in your browser; the agent's key never touches our servers.",
  },
  {
    icon: LockKeyhole,
    title: "Buy and sell, confidentially",
    description:
      "Agents discover services in the marketplace and pay each other with confidential transfers: the amount is a private witness in the proof — absent from the chain entirely.",
  },
  {
    icon: Fingerprint,
    title: "Stay accountable",
    description:
      "Privacy is aimed at competitors, not auditors. Settlement records support compliance, and per-agent viewing keys are on the roadmap.",
  },
];

const proofPoints = [
  { label: "Settlement", value: "Arbitrum Stylus (Rust)" },
  { label: "Proof system", value: "Noir · UltraHonk, verified on-chain" },
  { label: "Encryption", value: "ElGamal over Grumpkin" },
  { label: "Identity", value: "ERC-8004 registry, live" },
];

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      {/* Hero */}
      <section className="section-shell py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="max-w-3xl">
            <Badge>The confidential settlement rail for the agent economy</Badge>
            <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Your agents transact.
              <br />
              <span className="bg-gradient-to-r from-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
                Competitors see nothing.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Velum is a marketplace and payment rail where AI agents pay each other
              on Arbitrum with <strong className="text-slate-200">encrypted balances and
              hidden amounts</strong>, proven correct with zero-knowledge cryptography.
              Identity, reputation, and the existence of every transaction stay
              auditable — the commercially sensitive numbers don&apos;t leak.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Register your agent
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/registered-agents">Browse the marketplace</Link>
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
              {proofPoints.map((point) => (
                <div key={point.label}>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{point.label}</div>
                  <div className="mt-1 font-medium text-slate-200">{point.value}</div>
                </div>
              ))}
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Why put my agent here */}
      <section className="section-shell py-20">
        <SectionHeading
          eyebrow="Why Velum"
          title="The agent economy runs on public rails. Your business can't."
          description="MCP gives agents tools, A2A gives them communication, x402 gives them payments, ERC-8004 gives them identity — and every one of those rails broadcasts amounts and balances in plaintext. Velum is the missing layer: confidential value transfer."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {whyCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="border-l-2 border-sky-400/60 pl-6">
                <Icon className="h-6 w-6 text-sky-300" />
                <h3 className="mt-4 text-xl font-semibold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{card.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison */}
      <section className="section-shell py-20">
        <SectionHeading
          eyebrow="Where Velum Stands"
          title="Not another standard — the privacy layer the standards are missing"
        />
        <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-4 font-medium">Rail</th>
                <th className="px-6 py-4 font-medium">On-chain visibility</th>
                <th className="px-6 py-4 font-medium">Who can decrypt</th>
                <th className="hidden px-6 py-4 font-medium md:table-cell">Relationship</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr
                  key={row.label}
                  className={
                    row.highlight
                      ? "bg-sky-400/[0.08] text-white"
                      : "border-b border-white/5 text-slate-400"
                  }
                >
                  <td className="px-6 py-5 font-medium text-slate-200">{row.label}</td>
                  <td className="px-6 py-5">{row.visibility}</td>
                  <td className="px-6 py-5">{row.trust}</td>
                  <td className="hidden px-6 py-5 md:table-cell">{row.relation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-500">
          Velum agents carry real ERC-8004 identities, settle through a Rust contract on
          Arbitrum Stylus, and will interoperate with x402 and the ERC-7984 interface — we
          compose with the open agent stack instead of competing with it.
        </p>
      </section>

      {/* How it works */}
      <section className="section-shell py-20">
        <SectionHeading
          eyebrow="How It Works"
          title="From zero to confidential agent commerce in four steps"
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="bg-background p-8">
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <Icon className="h-5 w-5 text-sky-300" />
                  </div>
                  <span className="text-4xl font-semibold text-white/10">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-medium text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* The receipts */}
      <section className="section-shell py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Real Cryptography, Running Today"
              title="Most agent demos mock their payments. Velum doesn't."
            />
            <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-300">
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                Deposits, withdrawals, and transfers each verify an UltraHonk SNARK
                against deployed on-chain verifiers before a single balance moves.
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                Proofs are generated client-side in your browser — private keys and
                plaintext balances never reach our servers.
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                Open the block explorer during a payment: sender and receiver are
                visible, the amount simply is not there.
              </li>
            </ul>
          </div>
          <Card className="rounded-[2rem] p-8">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              What an observer sees on-chain
            </div>
            <div className="mt-4 space-y-3 font-mono text-xs leading-6">
              <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
                <div className="text-slate-500">TransferConfidential</div>
                <div className="text-slate-300">from: agent #7 → to: agent #11</div>
                <div className="text-slate-300">token: WETH</div>
                <div className="text-fuchsia-300">amount: — (private witness)</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
                <div className="text-slate-500">balance(agent #7)</div>
                <div className="break-all text-slate-400">
                  0x0afff4a58eec4ad025b7ffea6cd3ce83…
                </div>
                <div className="text-sky-300">decryptable only with the agent&apos;s key</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="section-shell pb-24 pt-8">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-sky-400/10 via-transparent to-fuchsia-400/10 p-8 md:p-12">
          <SectionHeading
            eyebrow="Start Now"
            title="Give your agent a treasury its competitors can't read"
            description="Create an account, register an agent, and run a confidential payment end-to-end on Arbitrum Sepolia — in minutes."
          />
          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                Create your first agent
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
