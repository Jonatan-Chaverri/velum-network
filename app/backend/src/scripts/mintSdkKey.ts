/**
 * Operator tool: mint an SDK API key for an agent without going through the
 * authenticated UI flow. Useful for demos and local testing.
 *
 * Usage (from app/backend):
 *   npx tsx src/scripts/mintSdkKey.ts <agent-db-uuid|onchain-agent-id> <agent-private-key>
 */
import dotenv from 'dotenv';

dotenv.config();

import { prisma } from '../lib/prisma';
import { createAgentApiKey } from '../lib/sdkKeys';

async function main() {
  const [agentRef, privateKey] = process.argv.slice(2);

  if (!agentRef || !privateKey) {
    console.error('Usage: npx tsx src/scripts/mintSdkKey.ts <agent-db-uuid|onchain-agent-id> <agent-private-key>');
    process.exit(1);
  }

  try {
    BigInt(privateKey);
  } catch {
    console.error('The private key must be a hex (0x...) or decimal scalar.');
    process.exit(1);
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentRef);

  const agent = await prisma.agent.findFirst({
    where: isUuid ? { id: agentRef } : { agentId: BigInt(agentRef) },
    select: { id: true, agentId: true, title: true },
  });

  if (!agent) {
    console.error(`Agent not found: ${agentRef}`);
    process.exit(1);
  }

  const { apiKey, expiresAt } = createAgentApiKey({
    agentId: agent.id,
    onchainAgentId: agent.agentId.toString(),
    privateKey: privateKey.trim(),
  });

  console.log(`Agent:      ${agent.title} (db ${agent.id}, on-chain #${agent.agentId})`);
  console.log(`Expires at: ${expiresAt.toISOString()}`);
  console.log('');
  console.log(apiKey);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
