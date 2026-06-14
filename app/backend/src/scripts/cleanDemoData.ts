/**
 * Demo cleanup: wipes all junk agents and their data, and removes test user
 * accounts, keeping only the real account so the DB is clean before recording.
 *
 * Keeps:  the user account(s) NOT listed in DELETE_USER_EMAILS.
 * Deletes: every agent (+ its services, reputation, invoices, transactions)
 *          and any user in DELETE_USER_EMAILS (+ their sessions).
 *
 * Usage (from app/backend):
 *   npx tsx src/scripts/cleanDemoData.ts
 */
import dotenv from 'dotenv';

dotenv.config();

import { prisma } from '../lib/prisma';

const DELETE_USER_EMAILS = ['ui-test-claude@example.com'];

async function main() {
  const before = {
    users: await prisma.user.count(),
    agents: await prisma.agent.count(),
    services: await prisma.service.count(),
    invoices: await prisma.invoice.count(),
    transactions: await prisma.transaction.count(),
  };
  console.log('Before:', before);

  // Transactions reference agents via SetNull, so delete them explicitly.
  const tx = await prisma.transaction.deleteMany({});
  // Invoices + services + reputation cascade from agents, but be explicit.
  const inv = await prisma.invoice.deleteMany({});
  const rep = await prisma.agentReputation.deleteMany({});
  const svc = await prisma.service.deleteMany({});
  const agents = await prisma.agent.deleteMany({});

  // Remove test user accounts (sessions cascade).
  const users = await prisma.user.deleteMany({ where: { email: { in: DELETE_USER_EMAILS } } });

  console.log('Deleted:', {
    transactions: tx.count,
    invoices: inv.count,
    reputation: rep.count,
    services: svc.count,
    agents: agents.count,
    users: users.count,
  });

  const remaining = await prisma.user.findMany({ select: { email: true } });
  console.log('Remaining users:', remaining.map((u) => u.email));

  const after = {
    users: await prisma.user.count(),
    agents: await prisma.agent.count(),
    services: await prisma.service.count(),
    invoices: await prisma.invoice.count(),
    transactions: await prisma.transaction.count(),
  };
  console.log('After:', after);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
