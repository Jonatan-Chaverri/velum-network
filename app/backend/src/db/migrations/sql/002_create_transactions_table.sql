-- Migration: Create transactions table
-- Description: Creates the transactions table with all required fields

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  token VARCHAR(255),
  amount VARCHAR(255),
  sender_address VARCHAR(255),
  receiver_address VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_sender_address ON transactions(sender_address);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_address ON transactions(receiver_address);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

