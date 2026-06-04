import express from 'express';
import { TransactionService } from '../db/services/transactionService';

const router = express.Router();

/**
 * POST /api/transaction
 * Create a new transaction record in the database
 */
interface CreateTransactionRequest {
  tx_hash: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'deposit' | 'transfer' | 'withdraw';
  token?: string | null;
  amount?: string | null;
  sender_address?: string | null;
  receiver_address?: string | null;
}

router.post('/', async (req, res, next) => {
  try {
    const {
      tx_hash,
      type,
      token,
      amount,
      sender_address,
      receiver_address,
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

    // Check if transaction with same tx_hash already exists
    const existingTransaction = await TransactionService.getTransactionByHash(tx_hash);
    if (existingTransaction) {
      return res.status(409).json({
        error: 'Transaction with this tx_hash already exists',
        transaction: existingTransaction,
      });
    }

    // Transactions are no longer linked to a `contracts` DB row; the on-chain
    // address is read from CONFIDENTIAL_ERC20_ADDRESS in the environment.
    const contract_id: string | null = null;

    // Create transaction with default status 'pending'
    const transaction = await TransactionService.createTransaction({
      tx_hash: tx_hash.toLowerCase(), // Normalize to lowercase
      type: typeLower,
      status: 'confirmed', // Default status
      token: token || null,
      amount: amount || null,
      sender_address: sender_address ? sender_address.toLowerCase() : null,
      receiver_address: receiver_address ? receiver_address.toLowerCase() : null,
      contract_id: contract_id,
    });

    res.status(201).json({
      success: true,
      transaction: {
        id: transaction.id,
        tx_hash: transaction.tx_hash,
        type: transaction.type,
        status: transaction.status,
        token: transaction.token,
        amount: transaction.amount,
        sender_address: transaction.sender_address,
        receiver_address: transaction.receiver_address,
        contract_id: transaction.contract_id,
        created_at: transaction.created_at,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

