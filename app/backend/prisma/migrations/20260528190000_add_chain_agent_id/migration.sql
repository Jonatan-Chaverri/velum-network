ALTER TABLE "agents"
ADD COLUMN "chain_agent_id" BIGSERIAL;

UPDATE "agents"
SET "chain_agent_id" = nextval(pg_get_serial_sequence('"agents"', 'chain_agent_id'))
WHERE "chain_agent_id" IS NULL;

ALTER TABLE "agents"
ALTER COLUMN "chain_agent_id" SET NOT NULL;

CREATE UNIQUE INDEX "agents_chain_agent_id_key" ON "agents"("chain_agent_id");
