# @velum/sdk

Minimal Node/TypeScript SDK for Velum Network: discover agent services, pay for
them **confidentially** on Arbitrum Sepolia, and gate your own services behind
payment — without touching any cryptography.

```ts
import { VelumAgent } from "@velum/sdk";

const agent = new VelumAgent({ apiKey: process.env.VELUM_API_KEY });

const services = await agent.findServices("research");
const invoice = await agent.requestInvoice(services[0].serviceId);
const receipt = await agent.pay(invoice);          // delegated proving, ~30-60s
const result = await agent.callService(invoice, { query: "..." }, receipt);
```

Seller side — gate any HTTP endpoint behind a confidential payment:

```ts
import { VelumClient } from "@velum/sdk";

const velum = new VelumClient({ apiKey: process.env.VELUM_API_KEY });

app.post("/summarize", async (req, res) => {
  await velum.requirePayment(req);          // settles confidentially before the work runs
  const result = await summarize(req.body.text);
  res.json(result);
});
```

`requirePayment` throws `PaymentRequiredError` (status 402) when the
`X-Velum-Receipt` header is missing, invalid, or was issued for another seller.

## Getting an API key

API keys are capability tokens (`vk_agent_...`) issued per agent and valid for
5 days. Issue one with `POST /api/agents/:id/sdk-key` (authenticated, body
`{ privateKey }`) — the key is shown once and never stored.

The agent's ElGamal private key travels **sealed** (AES-256-GCM under a
prover-only secret) inside the token. The API backend validates the HMAC
signature but cannot read the key; only the prover worker unseals it, in
memory, for the duration of one proof. This is the **delegated custody** mode —
the dashboard UI remains fully self-custodial (the key never leaves the
browser).

## How payment works

`pay()` posts to `/api/sdk/payments` and polls until settlement:

1. The platform prover unseals your key, decrypts your balance, checks
   solvency, and generates an UltraHonk transfer proof (~30-60s).
2. The platform (contract owner) submits `transferConfidential` on-chain; the
   verifier checks the proof and the encrypted balances update.
3. The invoice is marked paid and you get a platform-signed receipt (JWT) with
   `{ invoiceId, payerAgentId, sellerAgentId, amount, txHash }`.

Payments from the same agent are serialized server-side: a proof binds to the
current balance ciphertext, so concurrent transfers would go stale. The payment
job store is in-memory — if the backend restarts mid-payment, the invoice stays
pending and can be paid again.

## Options

```ts
new VelumAgent({
  apiKey: "vk_agent_...",
  baseUrl: "http://localhost:3001", // or VELUM_API_URL
  proving: "delegated",             // "local" is typed but not implemented (roadmap)
});
```

`proving: "local"` throws `not implemented — roadmap`: delegated proving keeps
the SDK dependency-free and works everywhere, and the platform is always the
relayer anyway (transfers are owner-submitted on-chain).

## Roadmap / known limits

- **Local proving** — prove on your own machine so the platform never sees the key.
- **Key revocation** (by `jti`) and **per-key spend limits** — today only `exp` (5 days) bounds a leaked key.
- **Durable payment jobs** — the in-memory store loses in-flight payments on restart (invoices stay payable).

## Example

`examples/buy-research.ts` runs the full flow (seller + buyer in one process):

```sh
VELUM_BUYER_API_KEY=vk_agent_... VELUM_SELLER_API_KEY=vk_agent_... npm run example
```
