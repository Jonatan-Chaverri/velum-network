import { BillingUnit, PricingModel, ServiceStatus } from '@prisma/client';
import express from 'express';

import { buildRegisterAgentTransaction } from '../lib/agentRegistration';
import { getAuthenticatedUserId } from '../lib/authUser';
import {
  loadEncryptedBalanceFromChain,
  submitConfidentialTransfer,
} from '../lib/confidentialTransfer';
import { getConfidentialErc20Address } from '../lib/contracts';
import { prisma } from '../lib/prisma';
import { createAgentApiKey } from '../lib/sdkKeys';
import {
  getErc8004RegistryAddress,
  getErc8004ExplorerUrl,
  registerAgentErc8004,
} from '../services/erc8004';

const router = express.Router();

type CreateAgentBody = {
  agentId?: string | number;
  name?: string;
  description?: string;
  category?: string;
  sellsServices?: boolean;
  publicKey?: string;
  service?: {
    price?: string;
    priceModel?: 'per response' | 'subscription';
    currency?: string;
    billingUnit?: 'response' | 'month';
    endpointUrl?: string;
    status?: 'visible' | 'hidden';
  };
};

type PrepareAgentBody = {
  publicKey?: string;
};

type TransferAgentBody = {
  senderAgentId?: string;
  receiverAgentId?: string;
  proofInputs?: number[];
  proof?: number[];
  token?: string;
  amount?: string;
};

function mapPricingModel(
  value: NonNullable<NonNullable<CreateAgentBody['service']>['priceModel']>,
): PricingModel {
  return value === 'subscription' ? PricingModel.subscription : PricingModel.per_request;
}

function mapServiceStatus(
  value: NonNullable<NonNullable<CreateAgentBody['service']>['status']>,
): ServiceStatus {
  return value === 'hidden' ? ServiceStatus.offline : ServiceStatus.online;
}

function isValidUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatAgentResponse(agent: {
  id: string;
  agentId: bigint;
  title: string;
  description: string;
  category: string;
  publicKey: string;
  erc8004AgentId?: bigint | null;
  erc8004TxHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
  services?: Array<{
    id: string;
    price: unknown;
    pricingModel: PricingModel;
    currency: string;
    billingUnit: BillingUnit;
    endpointUrl: string;
    status: ServiceStatus;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  const [service] = agent.services ?? [];

  return {
    id: agent.id,
    agentId: agent.agentId.toString(),
    title: agent.title,
    description: agent.description,
    category: agent.category,
    publicKey: agent.publicKey,
    erc8004AgentId: agent.erc8004AgentId != null ? agent.erc8004AgentId.toString() : null,
    erc8004TxHash: agent.erc8004TxHash ?? null,
    erc8004Url: agent.erc8004AgentId != null ? getErc8004ExplorerUrl(agent.erc8004AgentId) : null,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    service: service
      ? {
          ...service,
          price: String(service.price),
        }
      : null,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const agents = await prisma.agent.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        agentId: true,
        title: true,
        description: true,
        category: true,
        publicKey: true,
        erc8004AgentId: true,
        erc8004TxHash: true,
        createdAt: true,
        updatedAt: true,
        services: {
          select: {
            id: true,
            price: true,
            pricingModel: true,
            currency: true,
            billingUnit: true,
            endpointUrl: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      agents: agents.map((agent) => formatAgentResponse(agent)),
    });
  } catch (error) {
    next(error);
  }
});

// ERC-8004 agent card (registration file). Public and unauthenticated: this is
// what the IdentityRegistry tokenURI resolves to, so explorers and other
// agents can discover the agent's capabilities and payment rails.
router.get('/public/:id/card', async (req, res, next) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        agentId: true,
        title: true,
        description: true,
        category: true,
        publicKey: true,
        erc8004AgentId: true,
        services: {
          select: {
            price: true,
            pricingModel: true,
            currency: true,
            billingUnit: true,
            endpointUrl: true,
            status: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const registry = getErc8004RegistryAddress();
    const [service] = agent.services;

    return res.status(200).json({
      type: 'https://eips.ethereum.org/EIPS/eip-8004',
      name: agent.title,
      description: agent.description,
      services: service
        ? [
            {
              name: 'api',
              endpoint: service.endpointUrl,
              price: String(service.price),
              currency: service.currency,
              billingUnit: service.billingUnit,
            },
          ]
        : [],
      registrations:
        agent.erc8004AgentId != null && registry
          ? [
              {
                agentId: Number(agent.erc8004AgentId),
                agentRegistry: `eip155:421614:${registry}`,
              },
            ]
          : [],
      supportedTrust: ['feedback'],
      'x-velum': {
        velumAgentId: agent.agentId.toString(),
        category: agent.category,
        confidentialPayments: true,
        settlementContract: getConfidentialErc20Address(),
        elgamalPublicKey: agent.publicKey,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/public/:id/balance', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const agent = await prisma.agent.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        id: true,
        agentId: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const balance = await loadEncryptedBalanceFromChain(agent.agentId);

    return res.status(200).json({
      success: true,
      balance,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/transfer', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const {
      senderAgentId,
      receiverAgentId,
      proofInputs,
      proof,
      token,
      amount,
    }: TransferAgentBody = req.body;

    if (!senderAgentId || !receiverAgentId || !proofInputs || !proof || !token || !amount) {
      return res.status(400).json({
        error: 'senderAgentId, receiverAgentId, proofInputs, proof, token, and amount are required',
      });
    }

    if (!Array.isArray(proofInputs) || proofInputs.length !== 736) {
      return res.status(400).json({
        error: 'proofInputs must be a 736-byte array',
      });
    }

    if (!Array.isArray(proof) || proof.length === 0) {
      return res.status(400).json({
        error: 'proof must be a non-empty byte array',
      });
    }

    const senderAgent = await prisma.agent.findFirst({
      where: {
        id: senderAgentId,
        userId,
      },
      select: {
        id: true,
        agentId: true,
        publicKey: true,
      },
    });

    if (!senderAgent) {
      return res.status(404).json({ error: 'Sender agent not found' });
    }

    const receiverAgent = await prisma.agent.findUnique({
      where: {
        id: receiverAgentId,
      },
      select: {
        id: true,
        agentId: true,
        publicKey: true,
      },
    });

    if (!receiverAgent) {
      return res.status(404).json({ error: 'Receiver agent not found' });
    }

    const txHash = await submitConfidentialTransfer({
      proofInputs,
      proof,
      logContext: {
        route: 'agents.transfer',
        senderAgentId: senderAgent.agentId.toString(),
        receiverAgentId: receiverAgent.agentId.toString(),
      },
    });

    await prisma.transaction.create({
      data: {
        txHash: txHash.toLowerCase(),
        type: 'transfer',
        status: 'confirmed',
        token: token.toLowerCase(),
        amount,
      },
    });

    return res.status(200).json({
      success: true,
      txHash,
    });
  } catch (error) {
    next(error);
  }
});

// Issues an SDK API key for one of the caller's agents. The browser sends the
// agent's ElGamal private key (it already holds it when the treasury is
// unlocked); we seal it under PROVER_SEALING_KEY and embed it in the
// capability token. Nothing is persisted — the key is shown exactly once.
router.post('/:id/sdk-key', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const { privateKey } = req.body as { privateKey?: string };

    if (!privateKey?.trim()) {
      return res.status(400).json({ error: 'privateKey is required' });
    }

    let parsedKey: bigint;

    try {
      parsedKey = BigInt(privateKey.trim());
    } catch {
      return res.status(400).json({ error: 'privateKey must be a hex or decimal scalar' });
    }

    if (parsedKey <= 0n) {
      return res.status(400).json({ error: 'privateKey must be a positive scalar' });
    }

    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: {
        id: true,
        agentId: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { apiKey, expiresAt } = createAgentApiKey({
      agentId: agent.id,
      onchainAgentId: agent.agentId.toString(),
      privateKey: privateKey.trim(),
    });

    return res.status(201).json({
      success: true,
      apiKey,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: {
        id: true,
        agentId: true,
        title: true,
        description: true,
        category: true,
        publicKey: true,
        erc8004AgentId: true,
        erc8004TxHash: true,
        createdAt: true,
        updatedAt: true,
        services: {
          select: {
            id: true,
            price: true,
            pricingModel: true,
            currency: true,
            billingUnit: true,
            endpointUrl: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.status(200).json({
      success: true,
      agent: formatAgentResponse(agent),
    });
  } catch (error) {
    next(error);
  }
});

// Show or hide the agent's marketplace service. Only the owner can toggle it.
router.patch('/:id/service', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const { status } = req.body as { status?: 'visible' | 'hidden' };

    if (status !== 'visible' && status !== 'hidden') {
      return res.status(400).json({ error: "status must be 'visible' or 'hidden'" });
    }

    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: {
        id: true,
        services: {
          select: { id: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const [service] = agent.services;

    if (!service) {
      return res.status(400).json({ error: 'This agent does not sell a service' });
    }

    const updatedService = await prisma.service.update({
      where: { id: service.id },
      data: { status: mapServiceStatus(status) },
    });

    return res.status(200).json({
      success: true,
      service: {
        ...updatedService,
        price: String(updatedService.price),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Deletes the agent's Velum workspace (metadata, service listing, reputation).
// The on-chain registration is immutable and stays on Arbitrum Sepolia.
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true, agentId: true },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await prisma.agent.delete({
      where: { id: agent.id },
    });

    console.log('[agents.delete] agent removed', {
      userId,
      agentDbId: agent.id,
      agentId: agent.agentId.toString(),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/balance', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: {
        id: true,
        agentId: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const balance = await loadEncryptedBalanceFromChain(agent.agentId);

    return res.status(200).json({
      success: true,
      balance,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/prepare', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const { publicKey }: PrepareAgentBody = req.body;

    if (!publicKey?.trim()) {
      return res.status(400).json({
        error: 'publicKey is required',
      });
    }

    console.log('[agents.prepare] start', {
      userId,
      publicKeyLength: publicKey.trim().length,
    });

    const [result] = await prisma.$queryRaw<Array<{ nextval: bigint }>>`
      SELECT nextval(pg_get_serial_sequence('agents', 'agent_id'))::bigint AS nextval
    `;

    if (!result?.nextval) {
      throw new Error('Could not reserve the next on-chain agent id');
    }

    const transaction = buildRegisterAgentTransaction({
      publicKey: publicKey.trim(),
      agentId: result.nextval,
    });

    console.log('[agents.prepare] prepared', {
      userId,
      agentId: result.nextval.toString(),
      to: transaction.to,
      dataLength: transaction.data.length,
    });

    return res.status(200).json({
      success: true,
      agentId: result.nextval.toString(),
      transaction,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const { agentId, name, description, category, sellsServices, publicKey, service }: CreateAgentBody =
      req.body;

    if (agentId === undefined || agentId === null || `${agentId}`.trim() === '') {
      return res.status(400).json({
        error: 'agentId is required',
      });
    }

    if (!name?.trim() || !description?.trim() || !category?.trim()) {
      return res.status(400).json({
        error: 'name, description, and category are required',
      });
    }

    if (!publicKey?.trim()) {
      return res.status(400).json({
        error: 'publicKey is required',
      });
    }

    if (typeof sellsServices !== 'boolean') {
      return res.status(400).json({
        error: 'sellsServices must be a boolean',
      });
    }

    if (sellsServices) {
      if (!service) {
        return res.status(400).json({ error: 'service data is required' });
      }

      const {
        price,
        priceModel = 'per response',
        currency,
        billingUnit,
        endpointUrl,
        status = 'visible',
      } = service;

      if (!price || !/^\d+(\.\d{1,6})?$/.test(price)) {
        return res.status(400).json({
          error: 'service.price must be a positive number with up to 6 decimal places',
        });
      }

      if (!currency?.trim()) {
        return res.status(400).json({ error: 'service.currency is required' });
      }

      if (!endpointUrl?.trim() || !isValidUrl(endpointUrl.trim())) {
        return res.status(400).json({ error: 'service.endpointUrl must be a valid URL' });
      }

      if (
        (priceModel === 'per response' && billingUnit !== 'response') ||
        (priceModel === 'subscription' && billingUnit !== 'month')
      ) {
        return res.status(400).json({
          error: 'service.billingUnit does not match the selected price model',
        });
      }
    }

    let parsedAgentId: bigint;

    try {
      parsedAgentId = BigInt(agentId);
    } catch {
      return res.status(400).json({
        error: 'agentId must be a valid integer',
      });
    }

    if (parsedAgentId <= 0n) {
      return res.status(400).json({
        error: 'agentId must be greater than zero',
      });
    }

    console.log('[agents.create] start', {
      userId,
      agentId: parsedAgentId.toString(),
      name: name.trim(),
      category: category.trim(),
      sellsServices,
    });

    const createdAgent = await prisma.$transaction(async (transaction) => {
      const agent = await transaction.agent.create({
        data: {
          agentId: parsedAgentId,
          userId,
          title: name.trim(),
          description: description.trim(),
          category: category.trim(),
          publicKey: publicKey.trim(),
        },
      });

      let createdService = null;

      if (sellsServices && service) {
        createdService = await transaction.service.create({
          data: {
            agentId: agent.id,
            price: service.price as string,
            pricingModel: mapPricingModel(service.priceModel ?? 'per response'),
            currency: service.currency!.trim(),
            billingUnit:
              service.billingUnit === 'month' ? BillingUnit.month : BillingUnit.response,
            endpointUrl: service.endpointUrl!.trim(),
            status: mapServiceStatus(service.status ?? 'visible'),
          },
        });

        await transaction.agentReputation.create({
          data: {
            serviceId: createdService.id,
            successResponses: 0,
            totalRequests: 0,
          },
        });
      }

      return {
        agent,
        service: createdService,
      };
    });

    console.log('[agents.create] persisted', {
      userId,
      agentId: createdAgent.agent.agentId.toString(),
      agentDbId: createdAgent.agent.id,
      serviceCreated: !!createdAgent.service,
    });

    // Register the agent in the ERC-8004 IdentityRegistry. Best-effort: a chain
    // hiccup must not lose the agent the user just created.
    let erc8004: { erc8004AgentId: bigint; txHash: string } | null = null;

    try {
      const baseUrl = (process.env.PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
      erc8004 = await registerAgentErc8004(`${baseUrl}/api/agents/public/${createdAgent.agent.id}/card`);

      if (erc8004) {
        await prisma.agent.update({
          where: { id: createdAgent.agent.id },
          data: {
            erc8004AgentId: erc8004.erc8004AgentId,
            erc8004TxHash: erc8004.txHash,
          },
        });

        console.log('[agents.create] registered in ERC-8004', {
          agentDbId: createdAgent.agent.id,
          erc8004AgentId: erc8004.erc8004AgentId.toString(),
          txHash: erc8004.txHash,
        });
      }
    } catch (erc8004Error) {
      console.error('[agents.create] ERC-8004 registration failed (agent was still created):', erc8004Error);
    }

    return res.status(201).json({
      success: true,
      agent: formatAgentResponse({
        ...createdAgent.agent,
        erc8004AgentId: erc8004?.erc8004AgentId ?? null,
        erc8004TxHash: erc8004?.txHash ?? null,
        services: createdAgent.service ? [createdAgent.service] : [],
      }),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
