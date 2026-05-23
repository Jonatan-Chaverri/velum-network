import { supabase } from '../connection';
import { User, CreateUserInput } from '../types';

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(input: CreateUserInput): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: input.name,
        address: input.address,
        public_key_x: input.public_key_x ?? null,
        public_key_y: input.public_key_y ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get user by address
   */
  static async getUserByAddress(address: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('address', address)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get user by username (name field)
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get all users
   */
  static async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return data as User[];
  }

  /**
   * Update user
   */
  static async updateUser(id: string, updates: Partial<CreateUserInput>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}

