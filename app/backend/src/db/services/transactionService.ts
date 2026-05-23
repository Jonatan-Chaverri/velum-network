import { supabase } from '../connection';
import { Transaction, CreateTransactionInput, UpdateTransactionInput } from '../types';

export class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        tx_hash: input.tx_hash,
        type: input.type,
        status: input.status,
        token: input.token || null,
        amount: input.amount || null,
        sender_address: input.sender_address || null,
        receiver_address: input.receiver_address || null,
        contract_id: input.contract_id || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    return data as Transaction;
  }

  /**
   * Get transaction by tx_hash
   */
  static async getTransactionByHash(tx_hash: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('tx_hash', tx_hash)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get transaction: ${error.message}`);
    }

    return data as Transaction;
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get transaction: ${error.message}`);
    }

    return data as Transaction;
  }

  /**
   * Get transactions by address (sender or receiver)
   */
  static async getTransactionsByAddress(address: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_address.eq.${address},receiver_address.eq.${address}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }

    return data as Transaction[];
  }

  /**
   * Get transactions by type
   */
  static async getTransactionsByType(type: 'deposit' | 'transfer' | 'withdraw'): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }

    return data as Transaction[];
  }

  /**
   * Get transactions by status
   */
  static async getTransactionsByStatus(status: 'pending' | 'confirmed' | 'failed'): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }

    return data as Transaction[];
  }

  /**
   * Get all transactions
   */
  static async getAllTransactions(limit?: number): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }

    return data as Transaction[];
  }

  /**
   * Update transaction
   */
  static async updateTransaction(id: string, updates: UpdateTransactionInput): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    return data as Transaction;
  }

  /**
   * Update transaction by tx_hash
   */
  static async updateTransactionByHash(tx_hash: string, updates: UpdateTransactionInput): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('tx_hash', tx_hash)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    return data as Transaction;
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }
}

