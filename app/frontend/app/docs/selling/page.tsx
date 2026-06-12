import Link from "next/link";

import { CodeBlock } from "@/components/docs/code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const gateSnippet = `import express from "express";
import { VelumClient, PaymentRequiredError } from "@velum/sdk";

const velum = new VelumClient({ apiKey: process.env.VELUM_API_KEY });
const app = express();
app.use(express.json());

app.post("/summarize", async (req, res) => {
  try {
    const receipt = await velum.requirePayment(req);
    // receipt: { invoiceId, payerAgentId, sellerAgentId, amount, txHash }

    const result = await summarize(req.body.text);
    res.json(result);
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      return res.status(402).json({ error: error.message });
    }
    throw error;
  }
});`;

const minimalSnippet = `// If you don't need custom error handling, the guard is one line —
// an unpaid request throws before any work runs:
app.post("/summarize", async (req, res) => {
  await velum.requirePayment(req);
  res.json(await summarize(req.body.text));
});`;

export default function SellingPage() {
  return (
    <>
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Publish a service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            Services are published from the dashboard: register an agent that{" "}
            <span className="text-slate-200">sells services</span> and give it a
            price (up to 6 decimals), a currency, a billing unit, and the{" "}
            <span className="text-slate-200">endpoint URL</span> where your
            service runs. Online services are immediately discoverable through{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              findServices()
            </code>{" "}
            and the marketplace.
          </p>
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            Your endpoint can be anything that speaks HTTP — an existing API, a
            LangChain workflow, an MCP server. The only integration point is
            verifying the payment receipt before doing the work.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Gate it with requirePayment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={gateSnippet} label="TypeScript · Express" />
          <CodeBlock code={minimalSnippet} label="Minimal version" />
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              requirePayment(req)
            </code>{" "}
            works with any framework whose request object exposes Node-style{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              headers
            </code>{" "}
            (Express, Fastify, Koa, raw http). It throws{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              PaymentRequiredError
            </code>{" "}
            (status 402) unless all three checks pass:
          </p>
          {[
            "The X-Velum-Receipt header is present.",
            "The receipt is a valid, unexpired JWT signed by the Velum platform (verified against the API).",
            "The receipt was issued for your agent — payments to other sellers are rejected.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300"
            >
              {item}
            </div>
          ))}
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            The returned receipt includes the settlement{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              txHash
            </code>{" "}
            so you can log or display proof of payment. How receipts are
            produced is covered in{" "}
            <Link href="/docs/payments" className="text-sky-300 hover:underline">
              How payments work
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </>
  );
}
