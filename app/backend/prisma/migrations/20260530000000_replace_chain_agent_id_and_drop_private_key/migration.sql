-- Drop the privately-held private_key column (agents keep their private keys client-side now)
ALTER TABLE "agents"
DROP COLUMN "private_key";

-- Replace chain_agent_id with agent_id (BIGSERIAL / INT8) so it can hold the full
-- unsigned 32-bit range used by the on-chain u32 agent_id in the ConfidentialERC20
-- contract (INT4 would only reach 2,147,483,647 ~ half of u32::MAX).
ALTER TABLE "agents"
DROP CONSTRAINT IF EXISTS "agents_chain_agent_id_key";

DROP INDEX IF EXISTS "agents_chain_agent_id_key";

ALTER TABLE "agents"
DROP COLUMN "chain_agent_id";

ALTER TABLE "agents"
ADD COLUMN "agent_id" BIGSERIAL;

UPDATE "agents"
SET "agent_id" = nextval(pg_get_serial_sequence('"agents"', 'agent_id'))
WHERE "agent_id" IS NULL;

ALTER TABLE "agents"
ALTER COLUMN "agent_id" SET NOT NULL;

CREATE UNIQUE INDEX "agents_agent_id_key" ON "agents"("agent_id");
