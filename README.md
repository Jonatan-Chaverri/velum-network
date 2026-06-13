<p align="center">
  <img src="assets/logo.png" alt="Velum Network" width="140" />
</p>

<h1 align="center">Velum Network</h1>

> **The confidential settlement rail for the agent economy.**
> Agent-to-agent payments where the transfer amount and each agent's balance stay private — proven with zero-knowledge and verified on **Arbitrum Stylus**.

Velum is a payment, monetization, and discovery layer for AI agents, built on a confidential transfer primitive. Two agents can settle a payment on-chain, and an observer can see *that* they transacted — but **not how much moved, and not how much either agent holds**. Everything else (registration, discovery, deposits, withdrawals) behaves like ordinary on-chain infrastructure.

It plugs into the AI services you already run — OpenAI agents, LangChain workflows, MCP servers, APIs, automations, internal tools — and adds programmable payments, confidential settlement, monetization, discovery, and autonomous commerce. Your agents do **not** move into Velum; Velum integrates into them.

---

## The bet

Agents are starting to transact autonomously, and an open stack is forming to support it: **MCP** for tools, **A2A** for communication, **x402** for payments, **ERC-8004** for identity and reputation. But every one of those rails is **public by design** — amounts, balances, and revenue are broadcast in plaintext.

For real businesses, that's a non-starter. No company wants its supplier pricing, per-call costs, treasury size, or revenue-per-agent visible to every competitor with a block explorer.

Velum makes the **two most commercially sensitive numbers private** — the price paid in each transfer, and each agent's running balance — while keeping identity, reputation, and the existence of each transaction fully auditable. That's the missing privacy layer for agent commerce, and it's a feature, not a bolt-on.

---

## Where Velum sits in the agent stack

Velum is **not** a competing standard. It composes with the ecosystem and fills the one gap none of these layers cover: confidential value transfer.

| Layer | Standard / Project | What it handles | Relationship to Velum |
|---|---|---|---|
| Tool use | MCP | How agents call tools & services | Velum-monetized endpoints can be MCP servers |
| Communication | A2A | How agents discover & talk to each other | Complementary |
| Identity & reputation | ERC-8004 | On-chain agent ID, reputation, validation | **Velum consumes it** — agents bring their own ID; we surface it, we don't replace it |
| Public payments | x402 | Open stablecoin payments over HTTP 402 | **Complementary** — x402 for public micropayments, Velum when the amount must stay private |
| Confidential tokens (FHE) | ERC-7984 | Encrypted balances via an FHE coprocessor | A *different cryptographic path* — heavier, tied to chains with FHE infra |
| **Confidential settlement (ZK)** | **Velum** | **Private transfer amounts & balances, proven with Noir SNARKs** | **Verification is cheap and portable to any EVM chain — no FHE coprocessor required** |

**Why this matters:** the dominant confidential-token approach (ERC-7984) is FHE-based, and it comes with a structural trade-off: decryption runs through a **threshold KMS committee** — a set of parties who, together, *can* read any balance. Velum takes the **zero-knowledge path**: balances are ElGamal ciphertexts and **only the holder of the matching key can ever decrypt one** — there is no committee, no coprocessor network, and no operator with a master key. Proofs are generated client-side in Noir and verified on-chain, which keeps verification cheap and portable to any EVM chain. We don't reinvent identity, comms, or public payments — we add the privacy primitive on top of them.

**Confidential ≠ unaccountable.** Velum is built for businesses, so privacy is aimed at the *public* — competitors with a block explorer — not at auditors. Settlement amounts are recorded off-chain in the platform's settlement records, so the protocol can be audited and operate within regulatory requirements while revealing nothing on-chain. On the roadmap, per-agent **viewing keys** turn this operational guarantee into a cryptographic one: businesses grant auditors read access to their own flows without exposing anyone else's.

---

## What's confidential, what's public

The confidentiality guarantee is **narrow and specific** — which is what makes it auditable and credible.

**Private**
- The value transferred between two agents in each transfer.
- The **plaintext** of each agent's balance — readable only by the holder of the matching key.

**Public**
- That a transfer happened between two agents (sender & receiver IDs are public inputs to the proof).
- The token, and the agent public keys involved.
- Deposit and withdrawal amounts (they correspond to visible ERC-20 movements in and out of custody).
- The balance **ciphertexts** on-chain and the fact that each operation updates them.

This removes the two pieces of information that kill a public marketplace — the price actually paid and the revenue per agent — while leaving the rest of the system fully auditable.

---

## How it works

- Balances live on-chain as **ElGamal ciphertexts**; only the key holder can decrypt them.
- Deposits, withdrawals, and transfers are validated by **Noir-generated SNARKs** (UltraHonk). The custody contract — written in **Rust on Arbitrum Stylus** — checks every proof against an auto-generated on-chain Honk verifier before touching a single balance.
- In the **transfer circuit** the amount is a **private witness** — it never appears in the proof's public inputs, so no observer can read it from chain data.
- The **deposit/withdraw circuits** keep the amount public by design, because the contract needs it to move the underlying ERC-20 in and out of custody.

```text
Existing agent / API / workflow
        │  Velum SDK
        ▼
Velum commerce layer
  · merchant registration   · discovery
  · confidential payments   · programmable budgets
  · agent credentials
        ▼
Settlement on Arbitrum Stylus
  · Noir SNARK verification (transfers, deposits, withdrawals)
  · ElGamal encrypted balances
```

See [`contracts/README.md`](contracts/README.md) and [`wallet_proof/README.md`](wallet_proof/README.md) for the on-chain components and the circuits behind them.

---

## Developer experience

The SDK is the primary surface, designed to feel like the tools teams already use — Stripe, Clerk, Auth0, Supabase. A **minimal working SDK ships in this repo** (see `sdk/`): enough to register a service, gate it behind a confidential payment, and pay other agents from your own — the goal is that plugging Velum into an agent you already run takes minutes, not a migration. Adding confidential, paid access to an existing service is a few lines:

```ts
import { VelumClient } from "@velum/sdk";

const velum = new VelumClient({ apiKey: process.env.VELUM_API_KEY });

app.post("/summarize", async (req, res) => {
  await velum.requirePayment(req);          // settles confidentially before the work runs
  const result = await summarize(req.body.text);
  res.json(result);
});
```

Buying is just as short — discovery, invoice, confidential payment, and the paid call:

```ts
import { VelumAgent } from "@velum/sdk";

const agent = new VelumAgent({ apiKey: process.env.VELUM_API_KEY });

const services = await agent.findServices("research");
const invoice = await agent.requestInvoice(services[0].serviceId);
const receipt = await agent.pay(invoice);          // delegated proving + on-chain settlement
const result = await agent.callService(invoice, { query: "..." }, receipt);
```

With the SDK you can register services, verify a request is paid, build merchant-facing commerce flows, discover other services, trigger confidential purchases, and manage agent identities and access. See [`sdk/README.md`](sdk/README.md) for the full API and a runnable end-to-end example.

**Two custody modes, stated honestly.** In the dashboard UI the agent's key is **self-custodied** — it never leaves the browser; balances are decrypted and proofs are generated client-side. The SDK uses **delegated proving**: the key travels *sealed* (AES-256-GCM under a prover-only secret) inside the API key, is decrypted transiently in the platform's prover worker for the duration of one proof, and is never persisted — the API backend itself can't read it. Delegated mode trades key exposure *to the platform's prover* for universal reach (any Node process can pay, no wasm or proving stack required). That trade is consistent with Velum's threat model: privacy is against the public and competitors, not against the platform (see *Confidential ≠ unaccountable*). Local proving in the SDK is on the roadmap.

---

## Who it's for

Developers and teams already running OpenAI agents, LangChain workflows, MCP servers, APIs, automations, or internal services — who need to charge for usage, receive **confidential** payments, discover or buy services autonomously, and enforce budgets and permissions.

**Use cases**
1. **Monetize existing AI services** — add pricing, merchant identity, categories, and programmable access to a summarization API, research agent, compute service, trading-signal feed, or internal enterprise tool.
2. **Agent-to-agent purchasing** — agents discover services, satisfy payment requirements, pay for APIs/compute/data/workflows, and continue autonomous workflows after settlement.
3. **Programmable spending controls** — spend limits, merchant/category restrictions, approval rules, workflow-level budgets.
4. **Confidential B2B discovery (optional)** — listings expose only an endpoint, category, and pricing the merchant chooses to publish. Closer to a private B2B directory than a public agent feed: run public listings, gated lists, or skip publication entirely and use the same rails for direct enterprise integrations.

Velum is **not** a hosted agent runtime, a public ad directory, a wallet-centric app, or a cryptography demo.

---

## Live demo — the money shot

1. Agent **A** deposits WETH into custody (public ERC-20 movement).
2. Agent **A** pays Agent **B** for a service. The block explorer shows the transfer **happened** — sender, receiver, token — but the **amount is absent from the public inputs**.
3. On the explorer, each agent's balance is just an **ElGamal ciphertext**. We then decrypt A's balance **locally with the key** — on screen — proving the plaintext is readable only by the holder.

The contrast is the pitch: most "agentic" projects ship mocked payments. Velum runs **real ZK cryptography end-to-end against a deployed Stylus verifier**.

---

## Trust model & roadmap

We're explicit about what's production-grade today versus what's next — sharp reviewers will find this anyway, so here it is up front.

**Today**
- Confidential transfers and encrypted balances work end-to-end, verified against deployed on-chain verifiers and settled by the Stylus custody contract.
- Transfer settlement currently runs through an owner/relayer that submits proven transfers. The **privacy** is enforced by the circuits regardless, but the **liveness/ordering** path is not yet trust-minimized.
- Settlement amounts are recorded **off-chain** in the platform backend — by design, for auditability and regulatory compliance (see *Confidential ≠ unaccountable* above). On-chain observers learn nothing.
- **Solvency is proven in-circuit**: every transfer and withdrawal proves — without revealing either number — that the sender's decrypted balance covers the amount. Overdrafts and minting credit out of thin air are rejected by the verifier, not by trust.
- Amounts use 40-bit range proofs (sufficient for the demo's value range).
- Proof verification runs in auto-generated UltraHonk Solidity verifiers, called by the Stylus contract.
- **Every agent gets a real ERC-8004 identity**: on creation, agents are automatically registered in the ERC-8004 IdentityRegistry — the official reference implementation, which we deployed on Arbitrum Sepolia because the canonical registry isn't there yet (see the note under *Deployed contracts*). The identity NFT's `tokenURI` resolves to the agent's public card served by the platform, and the agent profile links straight to the on-chain identity.

**Next**
- **Verification inside Stylus** — port UltraHonk verification from the generated Solidity into the Rust/WASM contract itself, where the compute-heavy work belongs.
- **Non-custodial settlement** — move from owner-submitted to permissionless / account-abstraction relayers so no operator sits in the transfer path.
- **Viewing keys** — replace the operational audit record with cryptographic, per-agent auditor access.
- **ERC-8004 reputation & validation** — identity registration is live; next, wire the Reputation and Validation registries so buyers can evaluate sellers without exposing transaction values.
- **ERC-7984 / x402 interop** — bridge to public rails so teams can mix public and confidential settlement on the same infrastructure.
- **Wider range proofs** and audited circuits before mainnet value.
- **Multi-chain** — because verification is ZK and EVM-portable, the same verifier can deploy across Arbitrum Orbit chains and other EVMs.

---

## Why Arbitrum & Stylus

The custody contract — ciphertext storage, agent registry, proof orchestration, ERC-20 custody — is written in **Rust on Arbitrum Stylus**. Proof verification today runs through auto-generated UltraHonk **Solidity** verifiers that the Stylus contract calls before accepting any state change; we say so plainly because sharp reviewers will read `lib.rs` anyway.

That split is also the opportunity: verifying an UltraHonk proof is exactly the compute-heavy workload **Stylus (Rust/WASM)** is built to make cheap, and **porting verification from the generated Solidity into the Stylus contract itself** is the next engineering milestone — turning Velum into a true end-to-end Stylus ZK showcase. Beyond the tech, Velum is a native fit for the **Agentic AI** narrative: real agents, paying each other, privately, with verifiable cryptography. The ZK path also keeps us portable across EVM chains rather than locked to one ecosystem's privacy coprocessor.

---

## Getting started

> **Live demo:** _link coming with submission_ · **Demo video:** _link coming with submission_

### Deployed contracts (Arbitrum Sepolia)

| Contract | Address |
|---|---|
| ConfidentialERC20 (Stylus custody) | [`0x46f6d50fbda4ff5f6d83666792d4ce47718147ab`](https://sepolia.arbiscan.io/address/0x46f6d50fbda4ff5f6d83666792d4ce47718147ab) |
| ERC-8004 IdentityRegistry (official reference impl, our deployment) | [`0xCf0C9f0Bfd29B73c85351b61b5a758ba1E1ea2D9`](https://sepolia.arbiscan.io/address/0xCf0C9f0Bfd29B73c85351b61b5a758ba1E1ea2D9) |
| Deposit verifier (UltraHonk) | [`0x1348201d4382f8c8Da6Cb2eC485f6851669BF61d`](https://sepolia.arbiscan.io/address/0x1348201d4382f8c8Da6Cb2eC485f6851669BF61d) |
| Withdraw verifier (UltraHonk) | [`0xd3C931d97C38A0DAA7Ee699aC89922017b7f4447`](https://sepolia.arbiscan.io/address/0xd3C931d97C38A0DAA7Ee699aC89922017b7f4447) |
| Transfer verifier (UltraHonk) | [`0x8803ECDEAe2b61cabfaa74f6917542318D548394`](https://sepolia.arbiscan.io/address/0x8803ECDEAe2b61cabfaa74f6917542318D548394) |
| WETH (demo token) | [`0x2836ae2ea2c013acd38028fd0c77b92cccfa2ee4`](https://sepolia.arbiscan.io/address/0x2836ae2ea2c013acd38028fd0c77b92cccfa2ee4) |

> **Note on the ERC-8004 registry:** the 8004 team's canonical testnet deployment (`0x7177...d09A` on Ethereum Sepolia, Base Sepolia, Linea Sepolia, …) does not exist on Arbitrum Sepolia. So we deployed the [official reference implementation](https://github.com/erc-8004/erc-8004-contracts) ourselves — unmodified contracts behind a UUPS proxy, plus a ~15-line bootstrap initializer (their deploy pipeline hardcodes the 8004 team's owner address; see [`contracts/verifier/contracts/erc8004/`](contracts/verifier/contracts/erc8004/)). When a canonical registry lands on Arbitrum, Velum can re-register agents there with no code changes — it's the same interface.

> **Note on the settlement token (WETH vs. USDC):** prices and balances are denominated in **WETH** for now. The intent is to settle in **USDC** — a stable unit of account is the natural fit for an agent marketplace — but there's no convenient canonical USDC on Arbitrum Sepolia to test against, whereas WETH is trivial to obtain (just wrap testnet ETH). Since we're on testnet, we use WETH end-to-end and the marketplace shows prices in WETH. **On mainnet, settlement moves to USDC.** The swap is contained: the custody contract is token-agnostic in design (it keys balances by token address), so it mainly needs the token allowlist pointed at USDC and the amount-scaling constant adjusted for USDC's 6 decimals — the ZK circuits don't change.

### Run it locally

Prerequisites: Node 20+, a Postgres database, and MetaMask on **Arbitrum Sepolia** with some testnet ETH (wrap a little into the demo WETH to deposit).

```bash
# 1. Backend (API on :3001)
cd app/backend
npm install
cp env.example .env         # DB connection, RPC URL, contract addresses
npm run migrate
npm run dev

# 2. Frontend (Next.js on :3000)
cd app/frontend
npm install
npm run dev
```

Then: create an account → register an agent (this registers its ElGamal public key on-chain) → deposit WETH (a ZK proof is generated **in your browser**; your agent key never leaves it). The dashboard is for **treasury management** — deposits, withdrawals, and decrypting your own balances.

**Agent-to-agent payments go through the SDK** (`sdk/`) — this is an agent marketplace, so purchases are made by agents, not by humans clicking buttons: issue an API key for your agent (`POST /api/agents/:id/sdk-key`, or `npx tsx src/scripts/mintSdkKey.ts` from `app/backend`) and run the end-to-end example in [`sdk/examples/buy-research.ts`](sdk/examples/buy-research.ts). The backend needs two extra secrets in `.env` for this (`API_KEY_SIGNING_SECRET`, `PROVER_SEALING_KEY` — see `env.example`).

To rebuild the circuits or verifiers from source, see [`wallet_proof/README.md`](wallet_proof/README.md). For the Stylus contract, see [`contracts/README.md`](contracts/README.md).

---

*Velum helps developers add programmable, confidential commerce to the AI agents and services they already run.*