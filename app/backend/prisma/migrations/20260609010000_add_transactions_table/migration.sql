CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('deposit', 'transfer', 'withdraw');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'confirmed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tx_hash" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "token" TEXT,
    "amount" TEXT,
    "sender_address" TEXT,
    "receiver_address" TEXT,
    "contract_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transactions"
ADD COLUMN IF NOT EXISTS "token" TEXT,
ADD COLUMN IF NOT EXISTS "amount" TEXT,
ADD COLUMN IF NOT EXISTS "sender_address" TEXT,
ADD COLUMN IF NOT EXISTS "receiver_address" TEXT,
ADD COLUMN IF NOT EXISTS "contract_id" UUID,
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'type'
      AND udt_name <> 'TransactionType'
  ) THEN
    ALTER TABLE "transactions"
    ALTER COLUMN "type" TYPE "TransactionType"
    USING lower("type")::"TransactionType";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'status'
      AND udt_name <> 'TransactionStatus'
  ) THEN
    ALTER TABLE "transactions"
    ALTER COLUMN "status" TYPE "TransactionStatus"
    USING lower("status")::"TransactionStatus";
  END IF;
END $$;

ALTER TABLE "transactions"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "tx_hash" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "created_at" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_tx_hash_key" ON "transactions"("tx_hash");
CREATE INDEX IF NOT EXISTS "transactions_type_idx" ON "transactions"("type");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");
CREATE INDEX IF NOT EXISTS "transactions_sender_address_idx" ON "transactions"("sender_address");
CREATE INDEX IF NOT EXISTS "transactions_receiver_address_idx" ON "transactions"("receiver_address");
CREATE INDEX IF NOT EXISTS "transactions_created_at_idx" ON "transactions"("created_at");
CREATE INDEX IF NOT EXISTS "transactions_contract_id_idx" ON "transactions"("contract_id");
