import { BillingUnit, PricingModel, ServiceStatus } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

import { AuthRepository } from '../auth/repositories/authRepository';
import { TokenPayload } from '../auth/utils/tokens';
import { registerAgentPublicKeyOnChain } from '../lib/agentRegistration';
import { prisma } from '../lib/prisma';

const router = express.Router();

type CreateAgentBody = {
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

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

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

async function getAuthenticatedUserId(
  req: express.Request,
  res: express.Response,
): Promise<string | null> {
  const authorizationHeader = req.get('authorization');

  if (!authorizationHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token is required' });
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload &
      TokenPayload;

    if (payload.type !== 'access' || !payload.sub || !payload.jti || !payload.sid) {
      res.status(401).json({ error: 'Invalid access token' });
      return null;
    }

    const session = await AuthRepository.findSessionByAccessTokenJti(payload.jti);

    if (!session || session.id !== payload.sid || session.userId !== payload.sub) {
      res.status(401).json({ error: 'Invalid session' });
      return null;
    }

    if (session.revokedAt || session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Session expired or revoked' });
      return null;
    }

    await AuthRepository.touchSession(session.id);

    return payload.sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return null;
  }
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

router.post('/', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const { name, description, category, sellsServices, publicKey, service }: CreateAgentBody = req.body;

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

    const createdAgent = await prisma.$transaction(async (transaction) => {
      const agent = await transaction.agent.create({
        data: {
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

    try {
      await registerAgentPublicKeyOnChain({
        publicKey: createdAgent.agent.publicKey,
        agentId: createdAgent.agent.agentId,
      });
    } catch (registrationError) {
      await prisma.agent.delete({
        where: {
          id: createdAgent.agent.id,
        },
      });

      throw registrationError;
    }

    return res.status(201).json({
      success: true,
      agent: formatAgentResponse({
        ...createdAgent.agent,
        services: createdAgent.service ? [createdAgent.service] : [],
      }),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
