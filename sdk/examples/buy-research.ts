/**
 * End-to-end demo: one agent buys a research service from another, paying
 * confidentially on Arbitrum Sepolia.
 *
 * Prerequisites:
 * - Backend running on VELUM_API_URL (default http://localhost:3001).
 * - Two agents registered in the DB; the buyer must hold confidential funds.
 * - An API key for each agent. Mint them from the dashboard, or from
 *   app/backend: npx tsx src/scripts/mintSdkKey.ts <agent-id> <private-key>
 *
 * Run (from velum-network/sdk):
 *   VELUM_BUYER_API_KEY=vk_agent_... VELUM_SELLER_API_KEY=vk_agent_... npm run example
 *
 * Optional env: VELUM_API_URL, SERVICE_QUERY (default "research"),
 * SERVICE_ID (skip discovery), SELLER_PORT (default 4242).
 */
import express from 'express';

import { PaymentRequiredError, VelumAgent, VelumClient } from '../src';

const SELLER_PORT = Number(process.env.SELLER_PORT ?? 4242);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function startSeller(): Promise<void> {
  const velum = new VelumClient({ apiKey: requireEnv('VELUM_SELLER_API_KEY') });

  const app = express();
  app.use(express.json());

  app.post('/research', async (req, res) => {
    try {
      const receipt = await velum.requirePayment(req);
      console.log(`[seller] paid request — invoice ${receipt.invoiceId}, tx ${receipt.txHash}`);

      res.json({
        query: req.body?.query ?? null,
        findings: [
          'Confidential payments hide amounts on-chain while keeping settlement verifiable.',
          'This response was gated by requirePayment() — no receipt, no research.',
        ],
        paidWith: receipt.txHash,
      });
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        return res.status(402).json({ error: error.message });
      }
      console.error('[seller] error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  await new Promise<void>((resolve) => app.listen(SELLER_PORT, resolve));
  console.log(`[seller] research service listening on http://localhost:${SELLER_PORT}/research`);
}

async function main() {
  await startSeller();

  const agent = new VelumAgent({ apiKey: requireEnv('VELUM_BUYER_API_KEY') });

  // 1. Discover services
  const query = process.env.SERVICE_QUERY ?? 'research';
  const services = await agent.findServices(query);
  console.log(`[buyer] found ${services.length} service(s) for "${query}"`);

  const service = process.env.SERVICE_ID
    ? services.find((s) => s.serviceId === process.env.SERVICE_ID)
    : services[0];

  if (!service) {
    console.error('[buyer] no matching service found — register a seller agent with a service first');
    process.exit(1);
  }

  console.log(`[buyer] buying "${service.title}" — ${service.price} ${service.currency}/${service.billingUnit}`);

  // 2. Request an invoice at the listed price
  const invoice = await agent.requestInvoice(service.serviceId);
  console.log(`[buyer] invoice ${invoice.invoiceId} for ${invoice.amount} ${invoice.currency}`);

  // 3. Pay confidentially (delegated proving, ~30-60s; pay() polls internally)
  console.log('[buyer] paying — generating the transfer proof takes ~30-60s...');
  const startedAt = Date.now();
  const receipt = await agent.pay(invoice);
  console.log(`[buyer] settled in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  console.log(`[buyer] tx: https://sepolia.arbiscan.io/tx/${receipt.txHash}`);
  console.log('[buyer] note: the explorer shows the transfer happened, but not the amount.');

  // 4. Call the paid service with the receipt
  const result = await agent.callService(
    invoice,
    { query: 'state of confidential payments for AI agents' },
    receipt,
    // The demo seller runs locally; in production the invoice's endpointUrl is used.
    { url: `http://localhost:${SELLER_PORT}/research` },
  );

  console.log('[buyer] service response:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
