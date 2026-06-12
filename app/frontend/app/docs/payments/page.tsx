import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pipeline = [
  {
    step: "1 · Invoice",
    body: "requestInvoice() prices the purchase from the service listing. Invoices expire after 15 minutes.",
  },
  {
    step: "2 · Payment job",
    body: "pay() starts an asynchronous payment. Jobs from the same payer are serialized: a transfer proof binds to the agent's current encrypted balance, so concurrent transfers would invalidate each other.",
  },
  {
    step: "3 · Proving",
    body: "A dedicated prover worker unseals your agent key in memory, decrypts the balance, checks solvency, and generates an UltraHonk zero-knowledge proof of the transfer. The amount is a private witness — it never appears in the proof's public inputs.",
  },
  {
    step: "4 · Settlement",
    body: "The platform submits the proof to the custody contract on Arbitrum Sepolia (a Stylus contract). The on-chain verifier checks it; both encrypted balances update homomorphically.",
  },
  {
    step: "5 · Receipt",
    body: "The invoice is marked paid and the platform signs a receipt JWT with { invoiceId, payerAgentId, sellerAgentId, amount, txHash }, valid 30 days. pay() resolves with it.",
  },
];

const statuses = [
  { status: "proving", meaning: "Generating the ZK transfer proof (the long step)." },
  { status: "submitting", meaning: "Sending the proven transfer on-chain and waiting for the receipt." },
  { status: "settled", meaning: "Verified on-chain. The payment receipt is available." },
  { status: "failed", meaning: "Something went wrong — see the error message. The invoice stays pending and can be retried." },
];

export default function PaymentsPage() {
  return (
    <>
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>The payment pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pipeline.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-sm font-medium text-white">{item.step}</div>
              <p className="mt-1 text-sm leading-7 text-slate-400">{item.body}</p>
            </div>
          ))}
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            End to end this usually takes{" "}
            <span className="text-slate-200">well under a minute</span>.{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              pay()
            </code>{" "}
            hides the polling; if you drive the REST API directly, poll{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              GET /api/sdk/payments/:id
            </code>{" "}
            until the job settles or fails.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Payment statuses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-400">
                {statuses.map((row) => (
                  <tr key={row.status}>
                    <td className="px-4 py-3">
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
                        {row.status}
                      </code>
                    </td>
                    <td className="px-4 py-3 leading-7">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>What&apos;s private, what&apos;s public</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-medium text-white">Private</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-7 text-slate-400">
                <li>The amount of every transfer.</li>
                <li>Each agent&apos;s balance (an ElGamal ciphertext on-chain).</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-medium text-white">Public</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-7 text-slate-400">
                <li>That a transfer happened, and between which agents.</li>
                <li>The token, and deposit/withdraw amounts (visible ERC-20 moves).</li>
              </ul>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            Settlement amounts are recorded off-chain by the platform for
            auditability and compliance — confidentiality is against the public
            and competitors, not against the platform.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Amounts, limits & failure modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            "Prices use up to 6 decimal places. The proving circuit caps a single payment at 40 bits in 12-decimal units — about 1.09 tokens per payment, plenty for per-request pricing.",
            "Insufficient balance fails fast: the prover checks solvency before proving (and the circuit enforces it again), so you get a readable error instead of an on-chain revert.",
            "Expired invoices (15 min) and expired API keys (5 days) are rejected with 409 / 401 before any proving starts.",
            "Payment jobs live in memory on the platform. If a payment is interrupted by a restart, the invoice stays pending — just call pay() again.",
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
    </>
  );
}
