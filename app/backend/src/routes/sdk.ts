/**
 * SDK-facing routes (`/api/sdk/*`), authenticated with `Authorization: Bearer
 * <api key>` capability tokens (see lib/sdkKeys.ts). Consumed by @velum/sdk.
 */
import { ServiceStatus } from '@prisma/client';
import express from 'express';

import { convertDisplayAmountToProofAmount } from '../lib/amounts';
import { getWethTokenAddress } from '../lib/contracts';
import { prisma } from '../lib/prisma';
import { SdkKeyError, SdkKeyPayload, verifyAgentApiKey } from '../lib/sdkKeys';
import { enqueuePayment, getPayment, verifyReceipt } from '../prover/paymentQueue';

const INVOICE_TTL_MS = 15 * 60 * 1000;

const router = express.Router();

type SdkAgentContext = {
  keyPayload: SdkKeyPayload;
  agent: {
    id: string;
    agentId: bigint;
    title: string;
    publicKey: string;
  };
};

// Express request locals typing shortcut: the auth middleware stores the
// caller context in res.locals.sdk.
function getSdkContext(res: express.Response): SdkAgentContext {
  return res.locals.sdk as SdkAgentContext;
}

router.use(async (req, res, next) => {
  try {
    const authorizationHeader = req.get('authorization');

    if (!authorizationHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'API key is required (Authorization: Bearer vk_agent_...)' });
    }

    let keyPayload: SdkKeyPayload;

    try {
      keyPayload = verifyAgentApiKey(authorizationHeader.slice('Bearer '.length).trim());
    } catch (error) {
      if (error instanceof SdkKeyError) {
        return res.status(401).json({ error: error.message });
      }
      throw error;
    }

    const agent = await prisma.agent.findUnique({
      where: { id: keyPayload.agentId },
      select: {
        id: true,
        agentId: true,
        title: true,
        publicKey: true,
      },
    });

    if (!agent || agent.agentId.toString() !== keyPayload.onchainAgentId) {
      return res.status(401).json({ error: 'API key does not match a registered agent' });
    }

    res.locals.sdk = { keyPayload, agent } satisfies SdkAgentContext;
    return next();
  } catch (error) {
    return next(error);
  }
});

// Service discovery. Reuses the marketplace query; `query` filters by
// category/title/description, case-insensitive.
router.get('/services', async (req, res, next) => {
  try {
    const { agent } = getSdkContext(res);
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';

    const services = await prisma.service.findMany({
      where: {
        status: ServiceStatus.online,
        // An agent should not buy from itself.
        agent: { isNot: { id: agent.id } },
        ...(query
          ? {
              OR: [
                { agent: { category: { contains: query, mode: 'insensitive' } } },
                { agent: { title: { contains: query, mode: 'insensitive' } } },
                { agent: { description: { contains: query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        price: true,
        pricingModel: true,
        currency: true,
        billingUnit: true,
        endpointUrl: true,
        agent: {
          select: {
            id: true,
            agentId: true,
            title: true,
            description: true,
            category: true,
          },
        },
        reputation: {
          select: {
            successResponses: true,
            totalRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      services: services.map((service) => ({
        serviceId: service.id,
        agentId: service.agent.id,
        onchainAgentId: service.agent.agentId.toString(),
        title: service.agent.title,
        description: service.agent.description,
        category: service.agent.category,
        price: String(service.price),
        pricingModel: service.pricingModel,
        currency: service.currency,
        billingUnit: service.billingUnit,
        endpointUrl: service.endpointUrl,
        reputation: service.reputation
          ? {
              successResponses: service.reputation.successResponses,
              totalRequests: service.reputation.totalRequests,
            }
          : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/invoices', async (req, res, next) => {
  try {
    const { agent } = getSdkContext(res);
    const { serviceId } = req.body as { serviceId?: string };

    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        price: true,
        currency: true,
        endpointUrl: true,
        status: true,
        agent: { select: { id: true, agentId: true } },
      },
    });

    if (!service || service.status !== ServiceStatus.online) {
      return res.status(404).json({ error: 'Service not found or offline' });
    }

    if (service.agent.id === agent.id) {
      return res.status(400).json({ error: 'An agent cannot buy its own service' });
    }

    // Fails early if the price does not fit the circuit's 40-bit amount range.
    convertDisplayAmountToProofAmount(String(service.price), 'Service price');

    const invoice = await prisma.invoice.create({
      data: {
        sellerAgentId: service.agent.id,
        buyerAgentId: agent.id,
        amount: service.price,
        currency: service.currency,
        status: 'pending',
        expiresAt: new Date(Date.now() + INVOICE_TTL_MS),
      },
    });

    return res.status(201).json({
      success: true,
      invoice: {
        invoiceId: invoice.id,
        serviceId: service.id,
        sellerAgentId: service.agent.id,
        buyerAgentId: agent.id,
        amount: String(invoice.amount),
        currency: invoice.currency,
        status: invoice.status,
        expiresAt: invoice.expiresAt,
        endpointUrl: service.endpointUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Kicks off the async payment pipeline: proof generation runs in a separate
// prover process, then the platform submits the owner-signed transfer.
router.post('/payments', async (req, res, next) => {
  try {
    const { agent, keyPayload } = getSdkContext(res);
    const { invoiceId } = req.body as { invoiceId?: string };

    if (!invoiceId) {
      return res.status(400).json({ error: 'invoiceId is required' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        sellerAgentId: true,
        buyerAgentId: true,
        amount: true,
        status: true,
        expiresAt: true,
        sellerAgent: { select: { id: true, agentId: true, publicKey: true } },
      },
    });

    if (!invoice || invoice.buyerAgentId !== agent.id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'pending') {
      return res.status(409).json({ error: `Invoice is ${invoice.status}` });
    }

    if (invoice.expiresAt < new Date()) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'expired' } });
      return res.status(409).json({ error: 'Invoice has expired' });
    }

    const amount = String(invoice.amount);
    const proofAmount = convertDisplayAmountToProofAmount(amount, 'Invoice amount');

    const job = enqueuePayment({
      invoiceId: invoice.id,
      payerAgentId: agent.id,
      sellerAgentId: invoice.sellerAgent.id,
      amount,
      proverRequest: {
        sealedKey: keyPayload.sealedKey,
        senderOnchainId: agent.agentId.toString(),
        senderPublicKey: agent.publicKey,
        receiverOnchainId: invoice.sellerAgent.agentId.toString(),
        receiverPublicKey: invoice.sellerAgent.publicKey,
        token: getWethTokenAddress(),
        proofAmount: proofAmount.toString(),
      },
    });

    return res.status(202).json({
      success: true,
      payment: {
        paymentId: job.paymentId,
        invoiceId: job.invoiceId,
        status: job.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/payments/:id', async (req, res, next) => {
  try {
    const { agent } = getSdkContext(res);
    const job = getPayment(req.params.id);

    if (!job || job.payerAgentId !== agent.id) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.status(200).json({
      success: true,
      payment: {
        paymentId: job.paymentId,
        invoiceId: job.invoiceId,
        status: job.status,
        txHash: job.txHash ?? null,
        receipt: job.receipt ?? null,
        error: job.error ?? null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Receipt verification for sellers (`requirePayment`). The receipt is a JWT
// signed by the platform; this endpoint checks the signature and returns the
// claims so the seller can match them against its own agent and invoice.
router.get('/receipts/verify', async (req, res, next) => {
  try {
    const receipt = typeof req.query.receipt === 'string' ? req.query.receipt : '';

    if (!receipt) {
      return res.status(400).json({ error: 'receipt query parameter is required' });
    }

    try {
      const claims = verifyReceipt(receipt);

      return res.status(200).json({
        success: true,
        valid: true,
        receipt: {
          invoiceId: claims.invoiceId,
          payerAgentId: claims.payerAgentId,
          sellerAgentId: claims.sellerAgentId,
          amount: claims.amount,
          txHash: claims.txHash,
        },
      });
    } catch {
      return res.status(200).json({ success: true, valid: false, receipt: null });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
