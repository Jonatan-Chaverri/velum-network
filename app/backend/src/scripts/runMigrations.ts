import dotenv from 'dotenv';
import { runMigrations } from '../db/migrations/migrationRunner';
import { testConnection } from '../db/connection';
import { closePool } from '../db/postgres';

dotenv.config();

async function main() {
  try {
    // Test Supabase connection (for service operations)
    console.log('Testing Supabase connection...');
    const connected = await testConnection();
    if (!connected) {
      console.warn('⚠️  Supabase connection test failed (this is okay if using PostgreSQL directly)');
    } else {
      console.log('✓ Supabase connection successful\n');
    }

    // Run migrations (will use PostgreSQL if available, otherwise show instructions)
    await runMigrations();

    console.log('\n✅ Migration process completed successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration process failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up PostgreSQL connection pool
    try {
      await closePool();
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

main();

