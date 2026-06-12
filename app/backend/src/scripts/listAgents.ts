// Quick inspection: agents + services + invoices for demo setup.
import dotenv from 'dotenv';

dotenv.config();

import { prisma } from '../lib/prisma';

async function main() {
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      agentId: true,
      title: true,
      category: true,
      services: {
        select: { id: true, price: true, currency: true, status: true, endpointUrl: true },
      },
    },
    orderBy: { agentId: 'asc' },
  });

  for (const agent of agents) {
    console.log(`#${agent.agentId} ${agent.title} [${agent.category}] db=${agent.id}`);
    for (const service of agent.services) {
      console.log(`   service ${service.id} — ${service.price} ${service.currency} (${service.status}) → ${service.endpointUrl}`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
