# Velum Network

> **Programmable commerce infrastructure for AI agents**

Velum Network is a commerce, payment, and monetization layer for AI agents.

It helps developers take existing AI services such as OpenAI agents, LangChain workflows, MCP servers, APIs, automations, and internal tools, then add:

- programmable payments
- confidential transactions
- service monetization
- optional service discovery
- agent identities and credentials
- autonomous commerce workflows

Velum should feel closer to **Stripe + marketplace infrastructure for AI agents** than to a wallet, exchange, or closed platform.

## What Velum Is

Velum is:

- a payment layer for AI services
- a monetization layer for existing agents
- a discovery layer for agent capabilities
- a programmable settlement layer
- an SDK-first developer platform

Velum is not:

- a hosted agent runtime
- a mandatory marketplace ecosystem
- a wallet-centric application
- a cryptography demo

Your agents do **not** have to live inside Velum.

Instead, Velum integrates into the systems you already run.

## Core Product Story

Developers already have:

- OpenAI agents
- LangChain workflows
- MCP servers
- APIs
- automations
- internal services

Those systems need a way to:

- charge for usage
- receive confidential payments
- discover other services
- buy services autonomously
- enforce budgets and permissions

Velum provides that infrastructure.

## Main Use Cases

### 1. Monetize Existing AI Services

Register an existing service and add:

- pricing
- merchant identity
- service categories
- confidential payment handling
- programmable access rules

Examples:

- summarization APIs
- research agents
- compute services
- trading signal services
- workflow automations
- internal enterprise tools

### 2. Enable Agent-to-Agent Purchasing

Agents can:

- discover other services
- request or satisfy payment requirements
- pay for APIs, compute, data, and workflows
- continue autonomous workflows after settlement

### 3. Add Programmable Spending Controls

Developers can enforce:

- spend limits
- merchant restrictions
- category restrictions
- approval rules
- workflow-level budgets

### 4. Use Optional Discovery Infrastructure

Velum includes a marketplace-style discovery layer so agents can find services.

This is optional.

You can:

- publish your service for discovery
- use Velum only for payments
- support private relationships and direct integrations
- combine public distribution with private enterprise workflows

## How It Works

The typical integration flow looks like this:

1. Developer creates a Velum account
2. Developer registers an agent or service
3. Developer configures:
   - service endpoint
   - pricing
   - categories
   - permissions
4. Velum generates:
   - confidential payment identity
   - API credentials
   - programmable payment controls
5. Developer integrates the Velum SDK into an existing AI service
6. Other agents can:
   - discover the service
   - request invoices or access
   - pay confidentially
   - consume the service

## SDK-First Integration

The SDK is central to the product.

Velum should feel like:

- Stripe SDK
- Clerk SDK
- Auth0 SDK
- Supabase SDK

Example conceptual integration:

```ts
import { VelumClient } from "@velum/sdk";

const velum = new VelumClient({
  apiKey: process.env.VELUM_API_KEY,
});

app.post("/summarize", async (req, res) => {
  await velum.requirePayment(req);

  const result = await summarize(req.body.text);

  res.json(result);
});
```

Conceptually, the SDK should make it easy to:

- register services
- verify that a request is paid for
- create merchant-facing commerce flows
- discover other services
- trigger confidential purchases
- manage agent identities and access

## Architecture Direction

Velum sits between agent infrastructure and payment infrastructure.

It does not replace agent runtimes.

It adds:

- payment identity
- confidential settlement
- service discovery
- merchant registration
- programmable controls
- access and monetization workflows

High-level architecture:

```text
Existing agent / API / workflow
        |
        |  Velum SDK
        v
Velum commerce layer
  - merchant registration
  - discovery
  - confidential payments
  - programmable budgets
  - agent credentials
        |
        v
Settlement + infrastructure
```

## Marketplace Positioning

The marketplace is best understood as **optional discovery infrastructure**.

That means:

- you can list services so other agents can find them
- you can use Velum without relying on marketplace traffic
- you do not need to rebuild your business inside Velum
- you can monetize existing services directly through SDK integrations

This is important because developers want:

- composability
- direct control over distribution
- flexible go-to-market models
- low integration friction

## Confidential Transactions

Velum supports confidential payments because AI agents often need privacy around:

- balances
- transfer amounts
- service costs
- spending patterns
- operational behavior

For most users, this should feel like infrastructure rather than the main product story.

The primary value is:

- programmable commerce
- service monetization
- autonomous purchasing

Confidential settlement supports those workflows in the background.

## Onboarding Model

A clean onboarding flow should look like this:

1. Create account
2. Register service or agent
3. Add endpoint and pricing
4. Configure merchant details and permissions
5. Generate credentials
6. Integrate SDK
7. Start accepting or making agent payments

## Terminology Recommendations

Prefer:

- programmable commerce
- service monetization
- confidential transactions
- agent payments
- discovery infrastructure
- merchant profile
- service registration
- payment identity
- SDK integration

Avoid leading with:

- confidential wallet
- encrypted balance as the main story
- treasury infrastructure
- hosted agents
- mandatory marketplace
- cryptography-first framing

## Why This Direction Is Stronger

### SDK-first positioning improves adoption

Developers adopt infrastructure that fits their stack.

If Velum looks like an SDK-first layer, teams can plug it into:

- existing services
- existing agent runtimes
- existing internal tools

That is much easier to adopt than a product that appears to require rebuilding everything inside a new environment.

### Marketplace lock-in was risky

A mandatory marketplace story creates friction:

- developers fear platform dependence
- teams assume migration cost
- adoption looks like a business-model decision instead of a technical integration

Making discovery optional preserves flexibility while still giving Velum a network story.

### Infrastructure positioning is more scalable

Infrastructure scales better than a closed application model because it can support:

- public marketplaces
- private enterprise deployments
- internal automations
- direct service-to-service payments
- hybrid monetization models

### Developer onboarding gets simpler

The message becomes:

1. you already have an agent or service
2. Velum helps you monetize it
3. integrate the SDK
4. start receiving or making payments

That is much easier to understand than:

1. create a new kind of wallet
2. understand cryptographic balances
3. move into a new platform model

### Better for grants and hackathons

This positioning is stronger for hackathons, grants, and ecosystem partnerships because it clearly answers:

- what problem is being solved
- who can use it today
- how it integrates into real developer workflows
- why it can grow into broader agent infrastructure

It also makes demos easier:

- take an existing agent
- add Velum
- monetize the endpoint
- let another agent discover and pay for it

## Current App Direction

The frontend prototype currently includes:

- a public landing page
- a public discover-agents directory
- a public docs page
- a public contact page
- a dashboard for account-level management

These should continue to reinforce the same product message:

**Velum helps developers add programmable commerce to the AI agents and services they already run.**
