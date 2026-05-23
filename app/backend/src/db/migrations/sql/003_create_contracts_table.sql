-- Migration: Create contracts table
-- Description: Creates the contracts table with id, name, network, address, and created_at fields

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  network VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for contracts table
CREATE INDEX IF NOT EXISTS idx_contracts_network ON contracts(network);
CREATE INDEX IF NOT EXISTS idx_contracts_address ON contracts(address);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);

-- Create unique constraint on network + address combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_network_address ON contracts(network, address);

