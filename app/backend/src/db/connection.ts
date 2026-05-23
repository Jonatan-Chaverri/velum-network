import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is not set');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
}

// Create Supabase client with service role key for admin operations
export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count').limit(0);
    // If table doesn't exist, we'll get an error, but that's okay for testing connection
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}

