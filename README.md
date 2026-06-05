# Velum Network

> **Commerce infrastructure for AI agents with confidential transfer amounts and balances**

Velum Network is a payment, monetization, and discovery layer for AI agents. It is built on a confidential transfer primitive so that:

- the amount moved between two agents in any given transaction stays private, and
- each agent's balance is encrypted on-chain — only the agent's key holder can decrypt it, so **no one else can see how much your agent has earned or is currently holding**.

The rest of the system (service registration, discovery, settlement, deposit and withdrawal events) behaves like ordinary on-chain infrastructure.

It lets developers take existing AI services — OpenAI agents, LangChain workflows, MCP servers, APIs, automations, and internal tools — and add:

- programmable payments and settlement
- confidential agent-to-agent transfer amounts
- service monetization
- service discovery
- agent identities and credentials
- autonomous commerce workflows

Velum is **not** another open agent marketplace. The discovery layer sits on top of payment rails whose transfer amounts are hidden by zero-knowledge proofs — so listings are commercial endpoints first, not advertisements competing for attention.

## What Velum Is

Velum is:

- a payment layer for AI services
- a monetization layer for existing agents
- a discovery layer for agent capabilities
- a programmable settlement layer
- an SDK-first developer platform

Velum is not:

- a hosted agent runtime
- a public agent directory or ad listing
- a wallet-centric application
- a cryptography demo

Your agents do **not** have to live inside Velum. Velum integrates into the systems you already run, and agent-to-agent transfer amounts that flow through it stay confidential.

## Who It's For

Developers and teams that already operate:

- OpenAI agents
- LangChain workflows
- MCP servers
- APIs
- automations
- internal services

…and need a way to:

- charge for usage
- receive confidential payments
- discover other services
- buy services autonomously
- enforce budgets and permissions

## Main Use Cases

### 1. Monetize Existing AI Services

Register an existing service and add:

- pricing
- merchant identity
- service categories
- confidential payment handling
- programmable access rules

Common examples:

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

### 4. Use the Discovery Layer (Optional)

Velum includes a discovery layer so agents can find services. It is optional, and it sits on top of payment rails whose per-transfer amounts and balances are hidden by zero-knowledge cryptography.

That means:

- a listing exposes only what the merchant chooses to publish (endpoint, category, pricing)
- when one agent pays another for a service, the **amount of that transfer is not revealed on-chain**
- each agent's **balance is encrypted on-chain** and can only be decrypted by the agent's key holder — competitors and outside observers cannot see how much your agent has earned
- observers can see that a transfer happened between two agents, but not the amount and not the resulting balances
- private relationships and direct enterprise integrations are first-class — not a workaround

You can:

- publish your service for discovery
- use Velum only for payments and skip the discovery layer entirely
- combine public distribution with private enterprise workflows on the same infrastructure

## How It Works

The typical integration flow:

1. Create a Velum account
2. Register an agent or service
3. Configure:
   - service endpoint
   - pricing
   - categories
   - permissions
4. Velum generates:
   - confidential payment identity
   - API credentials
   - programmable payment controls
5. Integrate the Velum SDK into your service
6. Other agents can:
   - discover the service
   - request invoices or access
   - pay confidentially
   - consume the service

## SDK Integration

The SDK is the primary integration surface. It is designed to feel familiar to teams already using SDKs like Stripe, Clerk, Auth0, or Supabase.

Example integration:

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

With the SDK you can:

- register services
- verify that a request is paid for
- create merchant-facing commerce flows
- discover other services
- trigger confidential purchases
- manage agent identities and access

## Architecture

Velum sits between agent infrastructure and payment infrastructure. It does not replace agent runtimes.

It provides:

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

## Discovery, Plus a Confidential Transfer Primitive

The discovery layer is what most people call a marketplace, but it is built on top of payment rails with confidential transfer amounts and confidential balances. The result is closer to a private B2B directory than a public agent feed:

- listings advertise an **endpoint**, not a transaction history
- merchants control exactly what is published
- when an agent pays another through a listing, the **transferred amount is not exposed on-chain**
- each agent's **balance is encrypted on-chain**; only the agent's key holder can decrypt it, so outside observers cannot see how much your agent is earning over time
- you can run private listings, gated lists, or skip publication entirely and still use the same payment infrastructure

This removes the two most sensitive pieces of information from a public marketplace — the price actually paid in each transfer and the running revenue per agent — while keeping the rest of the system auditable.

## Confidential Transfer Amounts and Balances

The confidentiality guarantee in Velum is **narrow and specific**: the amount of value transferred from one agent to another in any given transfer is hidden, and the plaintext of each agent's balance is readable only by that agent. Everything else is ordinary on-chain state.

**What is private**

- the value transferred between two agents in each agent-to-agent transfer
- the **plaintext** of each agent's balance — only the holder of the matching key can decrypt it, so no one else can see how much your agent has earned or is currently holding

**What is public**

- the existence of a transfer between two agents (sender and receiver agent IDs are public inputs to the proof)
- the token being transferred
- the agent public keys involved
- deposit and withdrawal amounts (these are plaintext, since they correspond to visible ERC-20 movements in and out of custody)
- the balance **ciphertexts** stored on-chain and the fact that they are updated by each operation (the plaintext stays encrypted)

**How it works**

- balances are stored on-chain as ElGamal ciphertexts; only the holder of the matching key can decrypt them
- deposits, withdrawals, and transfers are validated by Noir-generated SNARKs verified on Arbitrum Stylus
- in the transfer circuit the amount is a private witness — it does **not** appear in the proof's public inputs, so no observer can read it from chain data
- deposit and withdraw circuits keep the amount as a public input by design, because the contract needs it to move the underlying ERC-20

See [contracts/README.md](contracts/README.md) and [wallet_proof/README.md](wallet_proof/README.md) for the on-chain components and the proof circuits that back them.

## Getting Started

1. Create an account
2. Register a service or agent
3. Add an endpoint and pricing
4. Configure merchant details and permissions
5. Generate credentials
6. Integrate the SDK
7. Start accepting or making agent payments

## Repository Layout

The repository currently includes:

- a public landing page
- a public agent directory
- a public docs site
- a public contact page
- a dashboard for account-level management
- confidential payment contracts and supporting circuits

All surfaces reinforce the same product message: **Velum helps developers add programmable commerce to the AI agents and services they already run.**
