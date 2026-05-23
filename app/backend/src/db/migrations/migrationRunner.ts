import { supabase } from '../connection';
import { executeSQL, getPostgresPool } from '../postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Migration {
  name: string;
  sqlFile: string;
}

const migrations: Migration[] = [
  {
    name: '001_create_users_table',
    sqlFile: '001_create_users_table.sql',
  },
  {
    name: '002_create_transactions_table',
    sqlFile: '002_create_transactions_table.sql',
  },
  {
    name: '003_create_contracts_table',
    sqlFile: '003_create_contracts_table.sql',
  },
  {
    name: '004_add_contract_id_to_users_and_transactions',
    sqlFile: '004_add_contract_id_to_users_and_transactions.sql',
  },
  {
    name: '005_alter_users_table_public_key',
    sqlFile: '005_alter_users_table_public_key.sql',
  },
];

let usePostgres = false;

/**
 * Check if we can use PostgreSQL connection for migrations
 */
async function canUsePostgres(): Promise<boolean> {
  try {
    await executeSQL('SELECT 1');
    return true;
  } catch (err: any) {
    if (err.message?.includes('DATABASE_URL') || err.message?.includes('SUPABASE_DB_PASSWORD')) {
      return false;
    }
    throw err;
  }
}

/**
 * Check if migrations table exists
 */
async function checkMigrationsTableExists(): Promise<boolean> {
  if (usePostgres) {
    try {
      const result = await executeSQL(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        );
      `);
      return result.rows[0]?.exists === true;
    } catch {
      return false;
    }
  } else {
    // Use Supabase client
    try {
      const { error } = await supabase
        .from('migrations')
        .select('id')
        .limit(0);
      return !error;
    } catch {
      return false;
    }
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  if (usePostgres) {
    try {
      const result = await executeSQL('SELECT name FROM migrations ORDER BY executed_at');
      return result.rows.map((row: any) => row.name);
    } catch {
      return [];
    }
  } else {
    try {
      const { data, error } = await supabase
        .from('migrations')
        .select('name');

      if (error) {
        return [];
      }

      return data.map((m: any) => m.name);
    } catch {
      return [];
    }
  }
}

/**
 * Record a migration as executed
 */
async function recordMigration(name: string): Promise<void> {
  if (usePostgres) {
    // Use parameterized query to prevent SQL injection
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    } finally {
      client.release();
    }
  } else {
    const { error } = await supabase
      .from('migrations')
      .insert({ name });

    if (error) {
      throw new Error(`Failed to record migration: ${error.message}`);
    }
  }
}

/**
 * Execute a migration SQL file
 */
async function executeMigrationSQL(sql: string): Promise<void> {
  if (usePostgres) {
    await executeSQL(sql);
  } else {
    throw new Error(
      'Cannot execute migrations without database connection. ' +
      'Please set DATABASE_URL or SUPABASE_DB_PASSWORD in your .env file.'
    );
  }
}

/**
 * Show manual migration instructions
 */
function showManualInstructions(): void {
  console.error('\n❌ Cannot execute migrations automatically!');
  console.log('\n📝 To enable automatic migrations, add one of these to your .env file:');
  console.log('   Option 1: DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres');
  console.log('   Option 2: SUPABASE_DB_PASSWORD=your_database_password');
  console.log('\n   Get your database password from: Supabase Dashboard > Settings > Database');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Manual Migration Instructions:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the SQL below, then click "Run"\n');
  
  // Print first migration
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FIRST MIGRATION - Copy this SQL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const firstMigrationPath = join(__dirname, 'sql', '001_create_users_table.sql');
    const firstMigrationSQL = readFileSync(firstMigrationPath, 'utf-8');
    console.log(firstMigrationSQL);
  } catch (err) {
    console.log('-- Could not read SQL file');
  }
  
  // Print second migration
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SECOND MIGRATION - After first one succeeds, copy this SQL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const secondMigrationPath = join(__dirname, 'sql', '002_create_transactions_table.sql');
    const secondMigrationSQL = readFileSync(secondMigrationPath, 'utf-8');
    console.log(secondMigrationSQL);
  } catch (err) {
    console.log('-- Could not read SQL file');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ After running both SQL migrations, run: npm run migrate');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Run migrations
 * Automatically executes SQL if database connection is available
 */
export async function runMigrations(): Promise<void> {
  console.log('🚀 Starting migration process...\n');

  // Check if we can use PostgreSQL for automatic execution
  try {
    usePostgres = await canUsePostgres();
    if (usePostgres) {
      console.log('✓ Database connection available - will execute migrations automatically\n');
    }
  } catch (err: any) {
    usePostgres = false;
    if (err.message?.includes('DATABASE_URL') || err.message?.includes('SUPABASE_DB_PASSWORD')) {
      console.log('⚠️  Database connection not configured - showing manual instructions\n');
      showManualInstructions();
      throw new Error('Database connection required for automatic migrations');
    }
    throw err;
  }

  // Check or create migrations table
  const migrationsTableExists = await checkMigrationsTableExists();
  
  if (!migrationsTableExists) {
    console.log('Creating migrations tracking table...');
    if (usePostgres) {
      try {
        const migrationsTableSQL = `
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        await executeMigrationSQL(migrationsTableSQL);
        console.log('✓ Migrations table created\n');
      } catch (err: any) {
        console.error('✗ Failed to create migrations table:', err.message);
        throw err;
      }
    } else {
      showManualInstructions();
      throw new Error('Migrations table does not exist. Please run the SQL migrations first.');
    }
  } else {
    console.log('✓ Migrations table exists\n');
  }

  // Get executed migrations
  const executedMigrations = await getExecutedMigrations();
  console.log(`Found ${executedMigrations.length} executed migration(s)\n`);

  // Run pending migrations
  for (const migration of migrations) {
    if (executedMigrations.includes(migration.name)) {
      console.log(`✓ Migration ${migration.name} already executed`);
      continue;
    }

    console.log(`\n📦 Running migration: ${migration.name}...`);

    // Read SQL file
    const sqlPath = join(__dirname, 'sql', migration.sqlFile);
    let sql: string;
    
    try {
      sql = readFileSync(sqlPath, 'utf-8');
    } catch (err) {
      throw new Error(`Could not read migration file: ${sqlPath}`);
    }

    // Execute migration
    if (usePostgres) {
      try {
        await executeMigrationSQL(sql);
        console.log(`✓ Migration ${migration.name} executed successfully`);
      } catch (err: any) {
        console.error(`✗ Migration ${migration.name} failed:`, err.message);
        throw err;
      }
    } else {
      showManualInstructions();
      throw new Error(`Migration ${migration.name} needs to be executed manually`);
    }

    // Record migration
    try {
      await recordMigration(migration.name);
      console.log(`✓ Migration ${migration.name} recorded`);
    } catch (err: any) {
      console.warn(`⚠️  Failed to record migration ${migration.name}:`, err.message);
      // Don't throw - migration was executed, just recording failed
    }
  }

  console.log('\n✅ All migrations completed successfully!');
}
