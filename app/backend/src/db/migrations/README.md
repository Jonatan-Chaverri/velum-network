# Database Migrations

This directory contains database migration files for the zk-wallet backend.

## Migration Files

- `001_create_users_table.sql` - Creates the users table
- `002_create_transactions_table.sql` - Creates the transactions table
- `003_create_contracts_table.sql` - Creates the contracts table
- `004_add_contract_id_to_users_and_transactions.sql` - Adds contract_id foreign keys to users and transactions tables with CASCADE delete

## Running Migrations

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL from each migration file
4. Execute the SQL in order (001, 002, 003, then 004)

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Programmatic Execution

The migration runner (`migrationRunner.ts`) can be used to track migrations, but actual DDL execution requires Supabase CLI or dashboard since the JS client doesn't support raw SQL execution.

## Migration Structure

Each migration file contains:
- Table creation SQL
- Index creation for performance
- Comments explaining the migration

## Adding New Migrations

1. Create a new SQL file following the naming pattern: `XXX_description.sql`
2. Create a corresponding TypeScript file: `XXX_description.ts`
3. Add the migration to `migrationRunner.ts`
4. Update this README

