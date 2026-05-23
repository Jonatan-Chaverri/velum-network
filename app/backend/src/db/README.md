# Database Setup

This directory contains the database connection, migrations, and service layers for the zk-wallet backend using Supabase.

## Setup

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your project URL and service role key from the project settings

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important**: Use the service role key (not the anon key) for backend operations. This key has admin privileges and should never be exposed to the frontend.

### 3. Run Migrations

#### Option A: Automatic Migrations (Recommended)

You can run migrations automatically without going to Supabase dashboard!

1. Get your database password from Supabase Dashboard → Settings → Database
2. Add to your `.env` file:
   ```env
   # Option 1: Full connection string
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   
   # OR Option 2: Just the password (will construct from SUPABASE_URL)
   SUPABASE_DB_PASSWORD=your_database_password
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

The script will automatically:
- Connect to your PostgreSQL database
- Create the migrations table if needed
- Execute all pending migrations
- Record them in the migrations table

#### Option B: Manual Migrations (If you prefer)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL files in order:
   - First: Copy and paste the contents of `src/db/migrations/sql/001_create_users_table.sql`
   - Then: Copy and paste the contents of `src/db/migrations/sql/002_create_transactions_table.sql`
   - Then: Copy and paste the contents of `src/db/migrations/sql/003_create_contracts_table.sql`
   - Then: Copy and paste the contents of `src/db/migrations/sql/004_add_contract_id_to_users_and_transactions.sql`
   - Finally: Copy and paste the contents of `src/db/migrations/sql/005_alter_users_table_public_key.sql`

4. After running SQL manually, run `npm run migrate` to record the migrations

## Database Schema

### Contracts Table

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  network VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(network, address)
);
```

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL UNIQUE,
  public_key_x TEXT,
  public_key_y TEXT,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  token VARCHAR(255),
  amount VARCHAR(255),
  sender_address VARCHAR(255),
  receiver_address VARCHAR(255),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Note**: The `contract_id` fields in both `users` and `transactions` tables have foreign key constraints with `ON DELETE CASCADE`, meaning that if a contract is deleted, all associated users and transactions will be automatically deleted as well.

## Usage

### Import Services

```typescript
import { UserService, TransactionService } from './db';

// Create a user
const user = await UserService.createUser({
  name: 'John Doe',
  address: '0x123...',
  public_key_x: '0xabc...',
  public_key_y: '0xdef...',
});

// Get user by address
const foundUser = await UserService.getUserByAddress('0x123...');

// Create a transaction
const transaction = await TransactionService.createTransaction({
  tx_hash: '0x456...',
  type: 'deposit',
  status: 'pending',
  token: '0x789...',
  amount: '1000000000000000000',
  sender_address: '0x123...',
});

// Get transactions by address
const transactions = await TransactionService.getTransactionsByAddress('0x123...');
```

## Services

### UserService

- `createUser(input)` - Create a new user
- `getUserByAddress(address)` - Get user by wallet address
- `getUserById(id)` - Get user by ID
- `getAllUsers()` - Get all users
- `updateUser(id, updates)` - Update user
- `deleteUser(id)` - Delete user

### TransactionService

- `createTransaction(input)` - Create a new transaction
- `getTransactionByHash(tx_hash)` - Get transaction by hash
- `getTransactionById(id)` - Get transaction by ID
- `getTransactionsByAddress(address)` - Get all transactions for an address
- `getTransactionsByType(type)` - Get transactions by type
- `getTransactionsByStatus(status)` - Get transactions by status
- `getAllTransactions(limit?)` - Get all transactions
- `updateTransaction(id, updates)` - Update transaction
- `updateTransactionByHash(tx_hash, updates)` - Update transaction by hash
- `deleteTransaction(id)` - Delete transaction

## Migration System

The migration system tracks which migrations have been executed. Migrations are stored in SQL files in `src/db/migrations/sql/`.

### Adding New Migrations

1. Create a new SQL file: `XXX_description.sql` in `src/db/migrations/sql/`
2. Add the migration to `src/db/migrations/migrationRunner.ts`:

```typescript
const migrations: Migration[] = [
  // ... existing migrations
  {
    name: 'XXX_description',
    sqlFile: 'XXX_description.sql',
  },
];
```

3. Run the SQL in Supabase dashboard
4. Run `npm run migrate` to record the migration

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend
- Use Row Level Security (RLS) policies in Supabase for production
- Consider using the anon key with RLS for client-side operations if needed

