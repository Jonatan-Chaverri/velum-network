/**
 * End-to-end demo: an agent discovers a research service, pays for it
 * confidentially on Arbitrum Sepolia, and calls the paid endpoint — all through
 * @velum/sdk.
 *
 * The seller is a *hosted* Velum service (POST /demo/research on the platform
 * backend), so nothing runs on localhost. You only run the buyer.
 *
 * Prerequisites:
 * - A buyer agent with confidential funds and an SDK API key. Seed everything
 *   with `npx tsx src/scripts/setupSdkDemo.ts` from app/backend.
 *
 * Run (from velum-network/sdk):
 *   VELUM_BUYER_API_KEY=vk_agent_... npm run example
 *
 * Optional env:
 *   VELUM_API_URL   platform backend (default: hosted Railway deployment)
 *   SERVICE_QUERY   discovery filter (default "research")
 *   SERVICE_ID      pin a specific service, skipping discovery
 */
import { VelumAgent } from '../src';

const DEFAULT_API_URL = 'https://velum-network-production.up.railway.app';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const baseUrl = (process.env.VELUM_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');
  const agent = new VelumAgent({ apiKey: requireEnv('VELUM_BUYER_API_KEY'), baseUrl });
  console.log(`[buyer] using Velum platform at ${baseUrl}`);

  // 1. Discover services
  const query = process.env.SERVICE_QUERY ?? 'research';
  const services = await agent.findServices(query);
  console.log(`[buyer] found ${services.length} service(s) for "${query}"`);

  const service = process.env.SERVICE_ID
    ? services.find((s) => s.serviceId === process.env.SERVICE_ID)
    : services[0];

  if (!service) {
    console.error('[buyer] no matching service found — seed a seller with setupSdkDemo.ts first');
    process.exit(1);
  }

  console.log(
    `[buyer] buying "${service.title}" — ${service.price} ${service.currency}/${service.billingUnit}`,
  );
  console.log(`[buyer] service endpoint: ${service.endpointUrl}`);

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

  // 4. Call the paid service with the receipt — uses the invoice's hosted endpoint
  const result = await agent.callService(
    invoice,
    { query: 'state of confidential payments for AI agents' },
    receipt,
  );

  console.log('[buyer] service response:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
