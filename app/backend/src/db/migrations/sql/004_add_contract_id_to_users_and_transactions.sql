-- Migration: Add contract_id to users and transactions tables
-- Description: Adds contract_id foreign key to users and transactions tables with CASCADE delete

-- Add contract_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contract_id UUID;

-- Add contract_id column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS contract_id UUID;

-- Create foreign key constraint on users.contract_id with CASCADE delete
-- Only add if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_users_contract_id'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT fk_users_contract_id 
    FOREIGN KEY (contract_id) 
    REFERENCES contracts(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create foreign key constraint on transactions.contract_id with CASCADE delete
-- Only add if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_transactions_contract_id'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_contract_id 
    FOREIGN KEY (contract_id) 
    REFERENCES contracts(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for contract_id columns
CREATE INDEX IF NOT EXISTS idx_users_contract_id ON users(contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON transactions(contract_id);

