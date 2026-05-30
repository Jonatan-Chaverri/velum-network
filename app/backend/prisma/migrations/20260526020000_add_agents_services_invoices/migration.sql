CREATE TYPE "PricingModel" AS ENUM ('per_request', 'subscription');
CREATE TYPE "BillingUnit" AS ENUM ('response', 'month');
CREATE TYPE "ServiceStatus" AS ENUM ('online', 'offline');
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid', 'expired', 'cancelled', 'failed');

CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agents_user_id_idx" ON "agents"("user_id");

ALTER TABLE "agents"
ADD CONSTRAINT "agents_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "pricing_model" "PricingModel" NOT NULL,
    "currency" TEXT NOT NULL,
    "billing_unit" "BillingUnit" NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "services_agent_id_idx" ON "services"("agent_id");

ALTER TABLE "services"
ADD CONSTRAINT "services_agent_id_fkey"
FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "seller_agent" UUID NOT NULL,
    "buyer_agent" UUID NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "tx_hash" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoices_seller_agent_idx" ON "invoices"("seller_agent");
CREATE INDEX "invoices_buyer_agent_idx" ON "invoices"("buyer_agent");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_seller_agent_fkey"
FOREIGN KEY ("seller_agent") REFERENCES "agents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_buyer_agent_fkey"
FOREIGN KEY ("buyer_agent") REFERENCES "agents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER set_agents_updated_at
BEFORE UPDATE ON "agents"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_services_updated_at
BEFORE UPDATE ON "services"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
