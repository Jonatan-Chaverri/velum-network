import { Pool, Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

/**
 * Get PostgreSQL connection pool
 * Uses direct database connection string from Supabase
 */
export function getPostgresPool(): Pool {
  if (pool) {
    return pool;
  }

  // Option 1: Use direct connection string if provided
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    return pool;
  }

  // Option 2: Construct from Supabase URL and password
  const supabaseUrl = process.env.SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !dbPassword) {
    throw new Error(
      'Either DATABASE_URL or both SUPABASE_URL and SUPABASE_DB_PASSWORD must be set.\n' +
      'Get your database connection string from Supabase Dashboard > Settings > Database > Connection string'
    );
  }

  // Extract project ref from Supabase URL
  // URL format: https://[project-ref].supabase.co
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    throw new Error('Invalid SUPABASE_URL format. Expected: https://[project-ref].supabase.co');
  }

  const projectRef = urlMatch[1];
  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}

/**
 * Execute raw SQL query
 */
export async function executeSQL(sql: string): Promise<any> {
  const client = await getPostgresPool().connect();
  try {
    const result = await client.query(sql);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute SQL in a transaction
 */
export async function executeSQLTransaction(queries: string[]): Promise<void> {
  const client = await getPostgresPool().connect();
  try {
    await client.query('BEGIN');
    for (const query of queries) {
      await client.query(query);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

