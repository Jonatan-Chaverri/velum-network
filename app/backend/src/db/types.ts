export interface Contract {
  id: string;
  name: string;
  network: string;
  address: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  address: string;
  public_key_x: string | null;
  public_key_y: string | null;
  contract_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  tx_hash: string;
  type: 'deposit' | 'transfer' | 'withdraw';
  status: 'pending' | 'confirmed' | 'failed';
  token: string | null;
  amount: string | null;
  sender_address: string | null;
  receiver_address: string | null;
  contract_id: string | null;
  created_at: string;
}

export interface CreateContractInput {
  name: string;
  network: string;
  address: string;
}

export interface CreateUserInput {
  name: string;
  address: string;
  public_key_x?: string | null;
  public_key_y?: string | null;
  contract_id?: string | null;
}

export interface CreateTransactionInput {
  tx_hash: string;
  type: 'deposit' | 'transfer' | 'withdraw';
  status: 'pending' | 'confirmed' | 'failed';
  token?: string | null;
  amount?: string | null;
  sender_address?: string | null;
  receiver_address?: string | null;
  contract_id?: string | null;
}

export interface UpdateTransactionInput {
  status?: 'pending' | 'confirmed' | 'failed';
  token?: string | null;
  amount?: string | null;
}

