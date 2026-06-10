import { BillingUnit, PricingModel, ServiceStatus } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

import { AuthRepository } from '../auth/repositories/authRepository';
import { TokenPayload } from '../auth/utils/tokens';
import { buildRegisterAgentTransaction } from '../lib/agentRegistration';
import { getConfidentialErc20Address, getWethTokenAddress } from '../lib/contracts';
import { prisma } from '../lib/prisma';

const { decodeFunctionResult, encodeFunctionData, parseAbi } = require('viem');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

const router = express.Router();
const confidentialErc20ReadAbi = parseAbi([
  'function balanceOfEnc(address token, uint32 agent_id) view returns (uint8[128])',
]);
const confidentialErc20WriteAbi = parseAbi([
  'function transfer_confidential(uint8[] proof_inputs, bytes proof)',
]);

const DEFAULT_FALLBACK_GAS_LIMIT = BigInt(8_000_000);
const DEFAULT_MAX_PRIORITY_FEE_PER_GAS_WEI = BigInt(20_000_000);
const DEFAULT_MIN_MAX_FEE_PER_GAS_WEI = BigInt(100_000_000);

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

function bytesToHex(bytes: number[]) {
  return `0x${bytes.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

async function loadEncryptedBalanceFromChain(agentId: bigint) {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error('RPC_URL environment variable is not set');
  }

  const confidentialErc20Address = getConfidentialErc20Address() as `0x${string}`;
  const wethTokenAddress = getWethTokenAddress() as `0x${string}`;

  const data = encodeFunctionData({
    abi: confidentialErc20ReadAbi,
    functionName: 'balanceOfEnc',
    args: [wethTokenAddress, Number(agentId)],
  });

  const rpcResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: confidentialErc20Address,
          data,
        },
        'latest',
      ],
    }),
  });

  const rpcPayload = await rpcResponse.json() as {
    result?: `0x${string}`;
    error?: { message?: string };
  };

  if (!rpcResponse.ok || rpcPayload.error || !rpcPayload.result) {
    throw new Error(rpcPayload.error?.message || 'Failed to read encrypted balance on-chain');
  }

  const balance = decodeFunctionResult({
    abi: confidentialErc20ReadAbi,
    functionName: 'balanceOfEnc',
    data: rpcPayload.result,
  });

  return {
    token: wethTokenAddress,
    network: process.env.NETWORK ?? 'SEPOLIA',
    encrypted: Array.from(balance as readonly bigint[], (value) => Number(value)),
  };
}

async function getServerTransactionFeeConfig(
  publicClient: any,
  request: { account: `0x${string}`; to: `0x${string}`; data: `0x${string}` },
) {
  let gasLimit = DEFAULT_FALLBACK_GAS_LIMIT;

  try {
    const estimatedGas = await publicClient.estimateGas(request);
    gasLimit = (estimatedGas * BigInt(12)) / BigInt(10);
  } catch (estimateError) {
    console.error(
      '[agents.transfer] eth_estimateGas failed, using fallback gas limit:',
      estimateError,
    );
  }

  let maxPriorityFeePerGas = DEFAULT_MAX_PRIORITY_FEE_PER_GAS_WEI;

  try {
    const suggestedPriorityFee = await publicClient.request({
      method: 'eth_maxPriorityFeePerGas',
    }) as `0x${string}`;

    maxPriorityFeePerGas = BigInt(suggestedPriorityFee);
  } catch (priorityFeeError) {
    console.warn(
      '[agents.transfer] priority fee fetch failed, using fallback priority fee:',
      priorityFeeError,
    );
  }

  let baseFeePerGas = BigInt(0);

  try {
    const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
    if (latestBlock.baseFeePerGas) {
      baseFeePerGas = latestBlock.baseFeePerGas;
    }
  } catch (baseFeeError) {
    console.warn('[agents.transfer] base fee fetch failed, using fallback fee floor:', baseFeeError);
  }

  const maxFeePerGas = baseFeePerGas > BigInt(0)
    ? (baseFeePerGas * BigInt(2)) + maxPriorityFeePerGas
    : DEFAULT_MIN_MAX_FEE_PER_GAS_WEI;

  return {
    gas: gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    baseFeePerGas,
  };
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

    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.ACCOUNT_PRIVATE_KEY as `0x${string}` | undefined;
    if (!rpcUrl || !privateKey) {
      return res.status(500).json({
        error: 'RPC_URL and ACCOUNT_PRIVATE_KEY must be configured for confidential transfers',
      });
    }

    const account = privateKeyToAccount(privateKey);
    const confidentialErc20Address = getConfidentialErc20Address() as `0x${string}`;
    const proofHex = bytesToHex(proof) as `0x${string}`;

    const data = encodeFunctionData({
      abi: confidentialErc20WriteAbi,
      functionName: 'transfer_confidential',
      args: [proofInputs, proofHex],
    });

    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    });

    const feeConfig = await getServerTransactionFeeConfig(publicClient, {
      account: account.address,
      to: confidentialErc20Address,
      data,
    });

    console.log('[agents.transfer] submitting owner transaction', {
      senderAgentId: senderAgent.agentId.toString(),
      receiverAgentId: receiverAgent.agentId.toString(),
      gas: feeConfig.gas.toString(),
      baseFeePerGas: feeConfig.baseFeePerGas.toString(),
      maxFeePerGas: feeConfig.maxFeePerGas.toString(),
      maxPriorityFeePerGas: feeConfig.maxPriorityFeePerGas.toString(),
    });

    const txHash = await walletClient.sendTransaction({
      account,
      to: confidentialErc20Address,
      data,
      gas: feeConfig.gas,
      maxFeePerGas: feeConfig.maxFeePerGas,
      maxPriorityFeePerGas: feeConfig.maxPriorityFeePerGas,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') {
      throw new Error('Transfer transaction reverted on-chain');
    }

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
