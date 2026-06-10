/*
  Warnings:

  - You are about to drop the column `contract_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `receiver_address` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `sender_address` on the `transactions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "transactions_contract_id_idx";

-- DropIndex
DROP INDEX "transactions_receiver_address_idx";

-- DropIndex
DROP INDEX "transactions_sender_address_idx";

-- AlterTable
ALTER TABLE "agents" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "agents_reputation" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "contract_id",
DROP COLUMN "receiver_address",
DROP COLUMN "sender_address",
ADD COLUMN     "associated_wallet" TEXT,
ADD COLUMN     "receiver_agent_id" UUID,
ADD COLUMN     "sender_agent_id" UUID,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "transactions_sender_agent_id_idx" ON "transactions"("sender_agent_id");

-- CreateIndex
CREATE INDEX "transactions_receiver_agent_id_idx" ON "transactions"("receiver_agent_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_agent_id_fkey" FOREIGN KEY ("sender_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_agent_id_fkey" FOREIGN KEY ("receiver_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
