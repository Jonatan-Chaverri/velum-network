import { supabase } from '../connection';
import { Contract, CreateContractInput } from '../types';

export class ContractService {
  /**
   * Create a new contract
   */
  static async createContract(input: CreateContractInput): Promise<Contract> {
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        name: input.name,
        network: input.network,
        address: input.address,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create contract: ${error.message}`);
    }

    return data as Contract;
  }

  /**
   * Get contract by name
   */
  static async getContractByName(name: string): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get contract: ${error.message}`);
    }

    return data as Contract;
  }

  /**
   * Get contract by name and network
   */
  static async getContractByNameAndNetwork(
    name: string,
    network: string
  ): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('name', name)
      .eq('network', network)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get contract: ${error.message}`);
    }

    return data as Contract;
  }

  /**
   * Get contract by ID
   */
  static async getContractById(id: string): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get contract: ${error.message}`);
    }

    return data as Contract;
  }

  /**
   * Get contract by network and address
   */
  static async getContractByNetworkAndAddress(
    network: string,
    address: string
  ): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('network', network)
      .eq('address', address)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get contract: ${error.message}`);
    }

    return data as Contract;
  }

  /**
   * Get all contracts
   */
  static async getAllContracts(): Promise<Contract[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get contracts: ${error.message}`);
    }

    return data as Contract[];
  }

  /**
   * Update contract
   */
  static async updateContract(
    id: string,
    updates: Partial<CreateContractInput>
  ): Promise<Contract> {
    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update contract: ${error.message}`);
    }

    return data as Contract;
  }

  /**
   * Delete contract
   */
  static async deleteContract(id: string): Promise<void> {
    const { error } = await supabase.from('contracts').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete contract: ${error.message}`);
    }
  }
}

