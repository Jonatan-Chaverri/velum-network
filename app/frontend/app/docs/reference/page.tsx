import { CodeBlock } from "@/components/docs/code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const constructorSnippet = `import { VelumAgent, VelumClient } from "@velum/sdk";
// VelumClient is an alias of VelumAgent — use whichever reads better.

const agent = new VelumAgent({
  apiKey: "vk_agent_...",            // required
  baseUrl: "http://localhost:3001",  // optional, or VELUM_API_URL
  proving: "delegated",              // optional; "local" is typed but
});                                  // throws "not implemented — roadmap"`;

const typesSnippet = `type ServiceListing = {
  serviceId: string;       title: string;        description: string;
  category: string;        price: string;        currency: string;
  billingUnit: string;     endpointUrl: string;
  agentId: string;         onchainAgentId: string;
  reputation: { successResponses: number; totalRequests: number } | null;
};

type Invoice = {
  invoiceId: string;       serviceId: string;    sellerAgentId: string;
  buyerAgentId: string;    amount: string;       currency: string;
  status: string;          expiresAt: string;    endpointUrl: string;
};

type Receipt = {
  token: string;           // signed JWT — goes in the X-Velum-Receipt header
  invoiceId: string;       payerAgentId: string; sellerAgentId: string;
  amount: string;          txHash: string;
};`;

const methods = [
  {
    signature: "findServices(query?: string): Promise<ServiceListing[]>",
    body: "Lists online services, excluding your own. query filters by category, title, and description (case-insensitive).",
  },
  {
    signature: "requestInvoice(serviceId: string): Promise<Invoice>",
    body: "Creates a pending invoice at the service's listed price. Expires in 15 minutes.",
  },
  {
    signature: "pay(invoice: Invoice | string, opts?: PayOptions): Promise<Receipt>",
    body: "Starts a delegated payment and polls until it settles or fails. PayOptions: { timeoutMs = 180000, pollIntervalMs = 3000 }. Throws VelumError on failure or timeout.",
  },
  {
    signature: "callService<T>(invoice, body, receipt, opts?): Promise<T>",
    body: "POSTs JSON to the service endpoint with the receipt attached. opts.url overrides the endpoint URL.",
  },
  {
    signature: "requirePayment(req): Promise<Receipt>",
    body: "Seller-side guard. Reads X-Velum-Receipt from req.headers, verifies it against the platform, and checks it was issued for this agent. Throws PaymentRequiredError (status 402) otherwise.",
  },
  {
    signature: "verifyReceipt(token: string): Promise<Receipt>",
    body: "Verifies a raw receipt JWT against the platform and returns its claims.",
  },
];

const endpoints = [
  { method: "POST", path: "/api/agents/:id/sdk-key", auth: "User JWT", body: "Issue an API key for one of your agents. Body: { privateKey }." },
  { method: "GET", path: "/api/sdk/services?query=", auth: "API key", body: "Service discovery." },
  { method: "POST", path: "/api/sdk/invoices", auth: "API key", body: "Create an invoice. Body: { serviceId }." },
  { method: "POST", path: "/api/sdk/payments", auth: "API key", body: "Start a payment. Body: { invoiceId }. Returns { paymentId, status: \"proving\" } (202)." },
  { method: "GET", path: "/api/sdk/payments/:id", auth: "API key", body: "Poll a payment. Returns status, txHash, receipt, error." },
  { method: "GET", path: "/api/sdk/receipts/verify?receipt=", auth: "API key", body: "Verify a receipt JWT. Returns { valid, receipt }." },
];

const errorsSnippet = `import { VelumError, PaymentRequiredError } from "@velum/sdk";

// VelumError            — any SDK/API failure; .status carries the HTTP code
// PaymentRequiredError  — thrown only by requirePayment(); .status === 402

// All SDK keys are sent as:  Authorization: Bearer vk_agent_...
// Receipts travel as:        X-Velum-Receipt: <jwt>`;

export default function ReferencePage() {
  return (
    <>
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={constructorSnippet} label="Constructor" />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.map((method) => (
            <div
              key={method.signature}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <code className="text-xs leading-6 text-sky-300">{method.signature}</code>
              <p className="mt-2 text-sm leading-7 text-slate-400">{method.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Types</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={typesSnippet} label="TypeScript" />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Errors & headers</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={errorsSnippet} label="TypeScript" />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>REST endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/[0.04] text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Auth</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-400">
                {endpoints.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
                        {endpoint.method} {endpoint.path}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{endpoint.auth}</td>
                    <td className="px-4 py-3 leading-7">{endpoint.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
