# Confidential ERC20 Contract

A confidential ERC-20 custody contract built for **Arbitrum Stylus** that enables private token transfers between **agents** using ElGamal encryption (Grumpkin curve) and Noir-generated zero-knowledge proofs.

## Overview

This contract provides confidential token custody and transfers by:
- Storing encrypted balances on-chain per **agent** (identified by a `u32 agent_id`) using ElGamal encryption over the Grumpkin curve.
- Verifying zero-knowledge proofs generated off-chain using Noir circuits.
- Enabling private deposits, withdrawals, and **agent-to-agent** transfers without revealing amounts.
- Binding each `agent_id` to a single on-chain **controller address** that is the only account authorized to submit operations for that agent.

All cryptographic operations (encryption, decryption, homomorphic operations, range checks) happen off-chain inside Noir circuits. The contract only stores ciphertexts, verifies proofs, updates balances with the new ciphertexts contained in the proof's public inputs, and moves the underlying ERC-20 in/out of custody.

## Current Deployment

**Network:** Arbitrum Sepolia
**Contract Address:** ``

## Architecture

### Design Principles

- **Off-chain cryptography**: all cryptographic math (ElGamal, Grumpkin curve operations, homomorphic add/sub, range / comparison checks) happens off-chain inside Noir circuits.
- **On-chain responsibilities**: the contract only:
  - Stores ciphertexts (as raw bytes split into 4 field mappings).
  - Verifies Noir proofs by calling the configured verifier contracts and checking the returned `bool`.
  - Updates balances using the new ciphertexts contained in the proof's public inputs.
  - Manages ERC-20 custody (`transferFrom` on deposit, `transfer` on withdraw).
  - Enforces that only an agent's registered controller can act on its behalf.

### Agent Model

The contract is **agent-centric**, not user-centric:

- Each agent is identified by a `u32 agent_id`.
- An agent is bound to a Grumpkin curve public key (used by the Noir circuits) and to a **controller address** (the account allowed to submit transactions for that agent).
- The first address to call `register_agent_pk(public_key, agent_id)` becomes that agent's controller.
- `deposit` and `withdraw` revert if the caller is not the registered controller of the agent.
- `transfer_confidential` is **owner-only**: confidential transfers are expected to happen automatically without user intervention, so the contract `owner` (the application backend) submits transfer proofs on behalf of agents.

### Supported Tokens

Currently supports **WETH** (Wrapped Ether) at address `0x2836ae2ea2c013acd38028fd0c77b92cccfa2ee4` on Arbitrum Sepolia. The token allowlist is initialized in `init` and there is currently no admin function to add more tokens.

## Public Endpoints

Function names below are written in their **Solidity / ABI** form (camelCase). The Rust source uses snake_case.

### Initialization & Setup

#### `init(depositVerifier, withdrawVerifier, transferVerifier)`
One-time initialization. Sets the three Noir verifier addresses, records the caller as `owner`, and allowlists WETH. Reverts if already initialized.

#### `registerAgentPk(publicKey: bytes64, agentId: uint32)`
Registers a Grumpkin curve public key (64 bytes = `x || y`) for `agentId` and records `msg.sender` as the agent's controller. Also writes the canonical "encrypted zero" as the agent's initial WETH balance. Reverts if `agentId` is already registered.

### Agent Operations

#### `deposit(proofInputs: bytes, proof: bytes)`
Pulls ERC-20 from the caller into custody and updates the agent's encrypted balance to the new ciphertext provided in `proofInputs`. Requires a valid Noir deposit proof. `proofInputs` MUST be exactly **416 bytes** (layout below). The caller must have approved the contract to spend `amount * 10^6` of the token.

#### `withdraw(proofInputs: bytes, proof: bytes)`
Pays ERC-20 from custody to the caller (the agent's controller) and updates the agent's encrypted balance. Requires a valid Noir withdraw proof. `proofInputs` MUST be exactly **416 bytes**.

#### `transferConfidential(proofInputs: bytes, proof: bytes)`
Confidentially transfers value from one agent to another. Both `senderAgentId` and `receiverAgentId` must be registered. **Only the contract `owner` may submit** — transfers are intended to be driven automatically by the application backend, not by the agents themselves. Requires a valid Noir transfer proof. `proofInputs` MUST be exactly **736 bytes** (layout below).

### View Functions

#### `balanceOfEnc(token: address, agentId: uint32) -> bytes128`
Returns the encrypted balance ciphertext for `(token, agentId)` as 128 bytes: `x1.x || x1.y || x2.x || x2.y`. Only the holder of the matching Grumpkin private key can decrypt.

#### `getAgentPk(agentId: uint32) -> bytes64`
Returns the registered Grumpkin public key for `agentId`, or 64 zero bytes if not registered.

#### `getAgentController(agentId: uint32) -> address`
Returns the controller address bound to `agentId` (zero address if not registered).

#### `isSupportedToken(token: address) -> bool`
Returns whether a token is in the allowlist.

#### `getDepositVerifier() -> address`, `getWithdrawVerifier() -> address`, `getTransferVerifier() -> address`
Return the configured Noir verifier addresses.

#### `getOwner() -> address`
Returns the contract owner.

### Admin Functions

#### `setVerifier(depositVerifier, withdrawVerifier, transferVerifier)`
Updates all three verifier addresses in one call. Only callable by `owner`.

#### `transferOwnership(newOwner: address)`
Transfers ownership of the contract to `newOwner`. Only callable by the current `owner`. Reverts on the zero address. After this call, `newOwner` becomes the only account allowed to submit `transferConfidential` and to call admin functions.

## Deployment

### Prerequisites

- Rust toolchain (configured via `rust-toolchain.toml`)
- `cargo-stylus` CLI
- Environment variables configured (see `env.example`)

### Environment Setup

Create a `.env` file in the contract directory:

```bash
RPC_URL=<your_arbitrum_sepolia_rpc_url>
ACCOUNT_PRIVATE_KEY=<your_deployer_private_key>
```

### Deploy Script

```bash
chmod +x deploy.sh

# Deploy to Arbitrum Sepolia
./deploy.sh

# Or check / dry-run without deploying
./deploy.sh --test
```

The script loads `.env`, runs `cargo stylus deploy` with the configured RPC and key, and prints the deployed address.

### Post-Deployment

1. **Initialize** the contract by calling `init(depositVerifier, withdrawVerifier, transferVerifier)` with the addresses of your three Noir verifier contracts.
2. **Register agents** by having each agent's controller call `registerAgentPk(publicKey, agentId)` with the agent's Grumpkin curve public key.

## Proof Input Layouts

Public inputs are passed as a flat `bytes` blob to the contract, then re-chunked into `bytes32[]` and forwarded to `verify(bytes,bytes32[])` on the Noir verifier. Each 32-byte word becomes one public input.

A "ciphertext" is 128 bytes laid out as two Grumpkin points: `x1.x || x1.y || x2.x || x2.y` (each coordinate 32 bytes).

### Deposit / Withdraw Proof Inputs (416 bytes)

| Offset      | Size | Field                                  |
|-------------|------|----------------------------------------|
| `0..64`     | 64   | `agent_pubkey` (Grumpkin: `x \|\| y`)  |
| `64..192`   | 128  | `current_balance` ciphertext           |
| `192..224`  | 32   | `token` (address in last 20 bytes)     |
| `224..256`  | 32   | `amount` (big-endian `U256`)           |
| `256..384`  | 128  | `new_balance` ciphertext               |
| `384..416`  | 32   | `agent_id` (`u32` in last 4 bytes)     |

### Transfer Proof Inputs (736 bytes)

| Offset      | Size | Field                                       |
|-------------|------|---------------------------------------------|
| `0..64`     | 64   | `receiver_pubkey`                           |
| `64..192`   | 128  | `receiver_current_balance` ciphertext       |
| `192..256`  | 64   | `sender_pubkey`                             |
| `256..384`  | 128  | `sender_current_balance` ciphertext         |
| `384..416`  | 32   | `token` (address in last 20 bytes)          |
| `416..544`  | 128  | `sender_new_balance` ciphertext             |
| `544..672`  | 128  | `receiver_new_balance` ciphertext           |
| `672..704`  | 32   | `sender_agent_id` (`u32` in last 4 bytes)   |
| `704..736`  | 32   | `receiver_agent_id` (`u32` in last 4 bytes) |

The actual transferred amount is **not** part of the transfer proof's public inputs — it is hidden inside the proof, achieving full confidentiality.

## Security Features

- **Reentrancy protection**: state-changing entry points are wrapped by a reentrancy guard.
- **Proof verification**: every state transition requires a valid Noir ZK proof. The contract decodes the verifier's `bool` return value and reverts on `false` or revert.
- **Balance consistency**: the `current_balance` ciphertext in the proof must match the stored ciphertext for the agent before any update is applied (prevents stale-state proofs / replays).
- **Public key binding**: pubkeys in the proof must match the pubkeys registered for the involved agents.
- **Caller authorization**: only the registered controller of an agent can submit `deposit` / `withdraw` for that agent; `transferConfidential` is restricted to the contract `owner`.
- **Token allowlist**: only allowlisted tokens can move through the contract.

## Events

- `TransferConfidential(address indexed token, uint32 indexed from, uint32 indexed to)` — confidential transfer between two agents.
- `Deposit(address indexed token, uint32 indexed agent_id)` — deposit into an agent's confidential balance.
- `Withdraw(address indexed token, uint32 indexed agent_id)` — withdrawal from an agent's confidential balance.
- `VerifierUpdated(address deposit_verifier, address withdraw_verifier, address transfer_verifier)` — verifier addresses updated by owner.
- `TokenAllowlistUpdated(address indexed token, bool allowed)` — declared in the ABI for future use.
- `AgentPkRegistered(uint32 indexed agent_id, address indexed controller, bytes pk)` — agent registered with its public key and controller.
- `OwnershipTransferred(address indexed previous_owner, address indexed new_owner)` — ownership transferred to a new address.

## Technical Details

### Encryption Scheme

- **Curve**: Grumpkin (BabyJubjub-family)
- **Encryption**: exponential ElGamal
- **Zero balance**: encoded as the generator point `G`
  - `G_GENERATOR_X = 1`
  - `G_GENERATOR_Y = sqrt(-16)`

### Amount Scaling

ElGamal in the circuit operates on values bounded by ~40 bits, so the prover passes amounts in "micro-token" units. The contract multiplies by `10^6` when calling the underlying ERC-20 on deposits / withdrawals. The Noir circuit and the on-chain amount MUST agree on this scaling.

### Storage Layout

- Encrypted balances: four parallel mappings keyed by `(token, agent_id)`, one per ciphertext coordinate (`x1.x`, `x1.y`, `x2.x`, `x2.y`).
- Agent state: `pk_x[agent_id]`, `pk_y[agent_id]`, and `agent_controllers[agent_id]`.
- Token allowlist: `supported_tokens[token]`.
- Admin / config: `owner`, `deposit_verifier`, `withdraw_verifier`, `transfer_verifier`.
- Reentrancy guard.
