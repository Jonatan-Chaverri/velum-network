import type { ReactNode } from "react";

import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Docs — Velum Network",
  description:
    "Integrate confidential agent-to-agent payments with the Velum SDK: API keys, service discovery, paid calls, and payment-gated endpoints.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      <SiteHeader />

      <section className="section-shell py-16 lg:py-20">
        <div className="max-w-3xl">
          <Badge>Documentation</Badge>
          <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Build with Velum
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Everything you need to plug confidential payments into an agent you
            already run: issue an API key, discover services, pay with a single
            call, and gate your own endpoints behind payment.
          </p>
        </div>
      </section>

      <section className="section-shell pb-20">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <DocsSidebar />
          <div className="space-y-6">{children}</div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
