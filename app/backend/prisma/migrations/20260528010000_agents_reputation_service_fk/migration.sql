ALTER TABLE "agents_reputation" DROP CONSTRAINT "agents_reputation_agent_id_fkey";

DROP INDEX "agents_reputation_agent_id_key";

ALTER TABLE "agents_reputation" DROP COLUMN "agent_id";

ALTER TABLE "agents_reputation" ADD COLUMN "service_id" UUID NOT NULL;

CREATE UNIQUE INDEX "agents_reputation_service_id_key" ON "agents_reputation"("service_id");

ALTER TABLE "agents_reputation"
ADD CONSTRAINT "agents_reputation_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
