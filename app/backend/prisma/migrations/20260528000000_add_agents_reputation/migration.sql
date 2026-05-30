CREATE TABLE "agents_reputation" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "success_responses" INTEGER NOT NULL DEFAULT 0,
    "total_requests" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_reputation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agents_reputation_agent_id_key" ON "agents_reputation"("agent_id");

ALTER TABLE "agents_reputation"
ADD CONSTRAINT "agents_reputation_agent_id_fkey"
FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
