/**
 * In-memory payment pipeline for SDK payments.
 *
 * Job store is intentionally in-memory (documented limitation): payments are
 * short-lived (~1-2 min) and the SDK polls until settled/failed. A backend
 * restart loses in-flight jobs — the invoice stays pending and can be paid
 * again. Durable jobs are roadmap.
 *
 * Jobs are serialized per sender agent: a transfer proof binds to the sender's
 * current balance ciphertext, so two concurrent payments from the same sender
 * would make the second proof stale ("Current balance mismatch" on-chain).
 */
import { fork } from 'child_process';
import crypto from 'crypto';
import path from 'path';

import jwt from 'jsonwebtoken';

import { convertProofAmountToErc20Amount } from '../lib/amounts';
import { submitConfidentialTransfer } from '../lib/confidentialTransfer';
import { prisma } from '../lib/prisma';
import { ProverJobRequest, ProverJobResult } from './types';

const PROVER_TIMEOUT_MS = 5 * 60 * 1000;
const RECEIPT_TTL = '30d';

export type PaymentStatus = 'proving' | 'submitting' | 'settled' | 'failed';

export type PaymentJob = {
  paymentId: string;
  invoiceId: string;
  payerAgentId: string; // DB uuid
  sellerAgentId: string; // DB uuid
  amount: string; // display units (token units, up to 6 decimals)
  status: PaymentStatus;
  txHash?: string;
  receipt?: string; // signed receipt JWT, present when settled
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReceiptClaims = {
  type: 'velum-receipt';
  invoiceId: string;
  payerAgentId: string;
  sellerAgentId: string;
  amount: string;
  txHash: string;
};

const jobs = new Map<string, PaymentJob>();
// Tail of the per-sender job chain; new jobs for the same sender await it.
const senderChains = new Map<string, Promise<void>>();

function touch(job: PaymentJob, patch: Partial<PaymentJob>) {
  Object.assign(job, patch, { updatedAt: new Date() });
}

export function getPayment(paymentId: string): PaymentJob | undefined {
  return jobs.get(paymentId);
}

export function signReceipt(claims: Omit<ReceiptClaims, 'type'>): string {
  return jwt.sign(
    { type: 'velum-receipt', ...claims } satisfies ReceiptClaims,
    process.env.JWT_SECRET as string,
    { expiresIn: RECEIPT_TTL },
  );
}

export function verifyReceipt(token: string): ReceiptClaims {
  const claims = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload &
    Partial<ReceiptClaims>;

  if (
    claims.type !== 'velum-receipt' ||
    !claims.invoiceId ||
    !claims.payerAgentId ||
    !claims.sellerAgentId ||
    !claims.txHash
  ) {
    throw new Error('Not a Velum receipt');
  }

  return claims as ReceiptClaims;
}

function runProver(request: ProverJobRequest): Promise<ProverJobResult> {
  return new Promise((resolve, reject) => {
    // In dev tsx serves .ts sources; in a compiled build this file is .js and
    // the worker sits next to it in dist/prover.
    const extension = path.extname(__filename);
    const workerPath = path.join(__dirname, `proverWorker${extension}`);
    const execArgv = extension === '.ts' ? ['--import', 'tsx'] : [];

    const child = fork(workerPath, [], { execArgv });
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        reject(new Error('Prover timed out'));
      }
    }, PROVER_TIMEOUT_MS);

    child.on('message', (result: ProverJobResult) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      }
    });

    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`Prover exited unexpectedly with code ${code}`));
      }
    });

    child.send(request);
  });
}

async function settlePayment(job: PaymentJob, proverRequest: ProverJobRequest) {
  const result = await runProver(proverRequest);

  if (!result.ok) {
    throw new Error(result.error);
  }

  touch(job, { status: 'submitting' });

  const txHash = await submitConfidentialTransfer({
    proofInputs: result.proofInputs,
    proof: result.proof,
    logContext: {
      paymentId: job.paymentId,
      invoiceId: job.invoiceId,
    },
  });

  const erc20Amount = convertProofAmountToErc20Amount(BigInt(proverRequest.proofAmount));

  await prisma.invoice.update({
    where: { id: job.invoiceId },
    data: {
      status: 'paid',
      paidAt: new Date(),
      txHash: txHash.toLowerCase(),
    },
  });

  await prisma.transaction.create({
    data: {
      txHash: txHash.toLowerCase(),
      type: 'transfer',
      status: 'confirmed',
      token: proverRequest.token.toLowerCase(),
      amount: erc20Amount.toString(),
      senderAgentId: job.payerAgentId,
      receiverAgentId: job.sellerAgentId,
    },
  });

  const receipt = signReceipt({
    invoiceId: job.invoiceId,
    payerAgentId: job.payerAgentId,
    sellerAgentId: job.sellerAgentId,
    amount: job.amount,
    txHash,
  });

  touch(job, { status: 'settled', txHash, receipt });
}

export function enqueuePayment(params: {
  invoiceId: string;
  payerAgentId: string;
  sellerAgentId: string;
  amount: string;
  proverRequest: Omit<ProverJobRequest, 'paymentId'>;
}): PaymentJob {
  const paymentId = crypto.randomUUID();

  const job: PaymentJob = {
    paymentId,
    invoiceId: params.invoiceId,
    payerAgentId: params.payerAgentId,
    sellerAgentId: params.sellerAgentId,
    amount: params.amount,
    status: 'proving',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  jobs.set(paymentId, job);

  const previous = senderChains.get(params.payerAgentId) ?? Promise.resolve();

  const run = previous.then(async () => {
    try {
      await settlePayment(job, { paymentId, ...params.proverRequest });
    } catch (error) {
      console.error('[paymentQueue] payment failed', {
        paymentId,
        invoiceId: params.invoiceId,
        error,
      });
      // The invoice stays pending so the buyer can retry with a new payment.
      touch(job, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  senderChains.set(params.payerAgentId, run);

  return job;
}
