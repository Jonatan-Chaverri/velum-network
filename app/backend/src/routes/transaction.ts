import express from 'express';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUserId } from '../lib/authUser';
import { prisma } from '../lib/prisma';

const router = express.Router();

/**
 * GET /api/transaction
 * List the transactions involving the authenticated user's agents.
 * Amounts are encrypted on-chain but visible here to the owner (stored in wei).
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const agentSelection = {
      select: {
        id: true,
        agentId: true,
        title: true,
        userId: true,
      },
    } as const;

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ senderAgent: { userId } }, { receiverAgent: { userId } }],
      },
      select: {
        id: true,
        txHash: true,
        type: true,
        status: true,
        token: true,
        amount: true,
        associatedWallet: true,
        createdAt: true,
        senderAgent: agentSelection,
        receiverAgent: agentSelection,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const formatParty = (
      agent: { id: string; agentId: bigint; title: string; userId: string } | null,
    ) =>
      agent
        ? {
            id: agent.id,
            agentId: agent.agentId.toString(),
            title: agent.title,
            isMine: agent.userId === userId,
          }
        : null;

    return res.status(200).json({
      success: true,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        txHash: transaction.txHash,
        type: transaction.type,
        status: transaction.status,
        token: transaction.token,
        amount: transaction.amount,
        associatedWallet: transaction.associatedWallet,
        createdAt: transaction.createdAt,
        senderAgent: formatParty(transaction.senderAgent),
        receiverAgent: formatParty(transaction.receiverAgent),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transaction
 * Create a new transaction record in the database
 */
interface CreateTransactionRequest {
  tx_hash: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'deposit' | 'transfer' | 'withdraw';
  token?: string | null;
  amount?: string | null;
  sender_agent_id?: string | number | null;
  receiver_agent_id?: string | number | null;
  associated_wallet?: string | null;
}

router.post('/', async (req, res, next) => {
  try {
    const {
      tx_hash,
      type,
      token,
      amount,
      sender_agent_id,
      receiver_agent_id,
      associated_wallet,
    }: CreateTransactionRequest = req.body;

    // Validate required fields
    if (!tx_hash || !type) {
      return res.status(400).json({
        error: 'Missing required fields: tx_hash and type are required',
      });
    }

    // Validate tx_hash format (basic check)
    if (!tx_hash.startsWith('0x') || tx_hash.length !== 66) {
      return res.status(400).json({
        error: 'Invalid tx_hash format. Expected 0x-prefixed 64-character hex string',
      });
    }

    // Normalize and validate type (accept both uppercase and lowercase)
    const typeUpper = type.toUpperCase();
    const validTypes = ['DEPOSIT', 'TRANSFER', 'WITHDRAW'];
    if (!validTypes.includes(typeUpper)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Convert to lowercase for database storage
    const typeLower = typeUpper.toLowerCase() as 'deposit' | 'transfer' | 'withdraw';
    const normalizedTxHash = tx_hash.toLowerCase();

    // Resolve the on-chain agent identifiers (BigInt `agent_id`) to the
    // internal Agent UUIDs used as foreign keys on the transaction.
    const resolveAgentUuid = async (
      value: string | number | null | undefined,
      field: string,
    ): Promise<string | null> => {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      let agentIdBigInt: bigint;
      try {
        agentIdBigInt = BigInt(value);
      } catch {
        throw { status: 400, message: `Invalid ${field}. Expected a numeric agent id.` };
      }

      const agent = await prisma.agent.findUnique({
        where: { agentId: agentIdBigInt },
        select: { id: true },
      });

      if (!agent) {
        throw { status: 404, message: `Agent not found for ${field}: ${value}` };
      }

      return agent.id;
    };

    let senderAgentUuid: string | null;
    let receiverAgentUuid: string | null;
    try {
      senderAgentUuid = await resolveAgentUuid(sender_agent_id, 'sender_agent_id');
      receiverAgentUuid = await resolveAgentUuid(receiver_agent_id, 'receiver_agent_id');
    } catch (resolveError: any) {
      if (resolveError && typeof resolveError.status === 'number') {
        return res.status(resolveError.status).json({ error: resolveError.message });
      }
      throw resolveError;
    }

    let transaction;

    try {
      transaction = await prisma.transaction.create({
        data: {
          txHash: normalizedTxHash,
          type: typeLower,
          status: 'confirmed',
          token: token || null,
          amount: amount || null,
          senderAgentId: senderAgentUuid,
          receiverAgentId: receiverAgentUuid,
          associatedWallet: associated_wallet ? associated_wallet.toLowerCase() : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingTransaction = await prisma.transaction.findUnique({
          where: {
            txHash: normalizedTxHash,
          },
        });

        return res.status(409).json({
          error: 'Transaction with this tx_hash already exists',
          transaction: existingTransaction,
        });
      }

      throw error;
    }

    res.status(201).json({
      success: true,
      transaction: {
        id: transaction.id,
        tx_hash: transaction.txHash,
        type: transaction.type,
        status: transaction.status,
        token: transaction.token,
        amount: transaction.amount,
        sender_agent_id: transaction.senderAgentId,
        receiver_agent_id: transaction.receiverAgentId,
        associated_wallet: transaction.associatedWallet,
        created_at: transaction.createdAt,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
