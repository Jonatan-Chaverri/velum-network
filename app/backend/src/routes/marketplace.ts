import { ServiceStatus } from '@prisma/client';
import express from 'express';

import { prisma } from '../lib/prisma';
import { getErc8004ExplorerUrl } from '../services/erc8004';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: {
        status: ServiceStatus.online,
      },
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
        agent: {
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
          },
        },
        reputation: {
          select: {
            successResponses: true,
            totalRequests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const agents = services.map((service) => {
      return {
        id: service.agent.id,
        agentId: service.agent.agentId.toString(),
        title: service.agent.title,
        description: service.agent.description,
        category: service.agent.category,
        publicKey: service.agent.publicKey,
        erc8004AgentId:
          service.agent.erc8004AgentId != null ? service.agent.erc8004AgentId.toString() : null,
        erc8004TxHash: service.agent.erc8004TxHash ?? null,
        erc8004Url:
          service.agent.erc8004AgentId != null
            ? getErc8004ExplorerUrl(service.agent.erc8004AgentId)
            : null,
        createdAt: service.agent.createdAt,
        updatedAt: service.agent.updatedAt,
        service: {
          id: service.id,
          price: String(service.price),
          pricingModel: service.pricingModel,
          currency: service.currency,
          billingUnit: service.billingUnit,
          endpointUrl: service.endpointUrl,
          status: service.status,
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
        },
      };
    });

    return res.status(200).json({
      success: true,
      agents,
    });
  } catch (error) {
    next(error);
  }
});

// Public detail view of a single marketplace listing, addressed by agent id.
// Only exposes the agent's public profile and its online service.
router.get('/:id', async (req, res, next) => {
  try {
    const service = await prisma.service.findFirst({
      where: {
        status: ServiceStatus.online,
        agent: {
          id: req.params.id,
        },
      },
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
        agent: {
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
          },
        },
        reputation: {
          select: {
            successResponses: true,
            totalRequests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.status(200).json({
      success: true,
      agent: {
        id: service.agent.id,
        agentId: service.agent.agentId.toString(),
        title: service.agent.title,
        description: service.agent.description,
        category: service.agent.category,
        publicKey: service.agent.publicKey,
        erc8004AgentId:
          service.agent.erc8004AgentId != null ? service.agent.erc8004AgentId.toString() : null,
        erc8004TxHash: service.agent.erc8004TxHash ?? null,
        erc8004Url:
          service.agent.erc8004AgentId != null
            ? getErc8004ExplorerUrl(service.agent.erc8004AgentId)
            : null,
        createdAt: service.agent.createdAt,
        updatedAt: service.agent.updatedAt,
        reputation: service.reputation
          ? {
              successResponses: service.reputation.successResponses,
              totalRequests: service.reputation.totalRequests,
            }
          : null,
        service: {
          id: service.id,
          price: String(service.price),
          pricingModel: service.pricingModel,
          currency: service.currency,
          billingUnit: service.billingUnit,
          endpointUrl: service.endpointUrl,
          status: service.status,
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
