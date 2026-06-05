# Velum Network Proof Circuits

Zero-knowledge proof circuits for confidential balance updates in Velum Network.

## Overview

This workspace contains three Noir circuits that back the confidential token workflows of Velum Network:

| Circuit    | Purpose                                                                | Homomorphic op |
| ---------- | ---------------------------------------------------------------------- | -------------- |
| `deposit`  | Add a plaintext deposit `amount` to an agent's encrypted balance.      | Addition       |
| `withdraw` | Remove a plaintext withdraw `amount` from an agent's encrypted balance. | Subtraction    |
| `transfer` | Move a private `transfer_amount` from a sender agent to a receiver agent, updating both encrypted balances. | Sender: subtraction; receiver: addition |

Each circuit produces a SNARK that the Stylus contract verifies before mutating on-chain state. The circuits never reveal:

- the agent's current balance
- the resulting new balance
- (for `transfer`) the transfer amount
- the randomness used during encryption
- the agent's private key

The deposit and withdraw circuits expose `amount` publicly because the underlying ERC-20 transfer must be observable on-chain.

## Workspace Layout

```
wallet_proof/
├── deposit/             # Deposit circuit (homomorphic addition)
├── withdraw/            # Withdraw circuit (homomorphic subtraction)
├── transfer/            # Agent-to-agent transfer circuit
├── test_data_generator/ # Helper circuit for producing fixtures
├── contracts/
│   ├── DepositVerifier.sol
│   ├── WithdrawVerifier.sol
│   └── TransferVerifier.sol
├── generate-verifier.mjs
├── Nargo.toml           # Workspace manifest
└── package.json         # JS tooling for proof generation
```

The workspace `Nargo.toml` lists `deposit`, `withdraw`, `transfer`, and `test_data_generator` as members.

## Shared Types

All circuits use a slim `Point` struct that matches the Solidity / Stylus verifier ABI:

```noir
struct Point {
    x: Field,
    y: Field
}
```

Internally, circuits reconstruct `EmbeddedCurvePoint` (with `is_infinite: false`) and `CipherText = (EmbeddedCurvePoint, EmbeddedCurvePoint)` from these `Point`s. A `CipherText` is exposed across the ABI as four `Point`s (`x1.x, x1.y, x2.x, x2.y`).

Common conventions:

- All balances and amounts are `Field` elements constrained to `≤ 2^40 - 1`.
- All `agent_id` values are constrained to `≤ 2^32 - 1`.
- `token` is a 32-byte field that identifies the token contract.
- ElGamal is used on the BabyJub embedded curve, in the exponential variant `(x1 = r·G, x2 = r·H + m·G)`.
- The prover must always supply fresh, cryptographically secure randomness for every encryption.

## Circuit Interfaces

### Deposit (`deposit/src/main.nr`)

```noir
fn main(
    // Private inputs
    agent_priv_key: Field,
    r_amount: Field,
    agent_id: Field,

    // Public inputs
    agent_pubkey: pub Point,
    current_balance_x1: pub Point,
    current_balance_x2: pub Point,
    token: pub Field,
    amount: pub Field
) -> pub (Point, Point, Field)
```

**Private inputs**

| Input            | Type    | Description                                                       |
| ---------------- | ------- | ----------------------------------------------------------------- |
| `agent_priv_key` | `Field` | Agent's ElGamal private key. Used to prove ownership of pubkey.   |
| `r_amount`       | `Field` | Randomness for encrypting the deposit amount.                     |
| `agent_id`       | `Field` | Off-chain agent identifier, exposed as a public output.           |

**Public inputs**

| Input                | Type    | Description                                                      |
| -------------------- | ------- | ---------------------------------------------------------------- |
| `agent_pubkey`       | `Point` | Agent's ElGamal public key.                                      |
| `current_balance_x1` | `Point` | Current balance ciphertext, component `x1`.                      |
| `current_balance_x2` | `Point` | Current balance ciphertext, component `x2`.                      |
| `token`              | `Field` | Token contract identifier.                                       |
| `amount`             | `Field` | Plaintext deposit amount (visible because the ERC-20 transfer is observable). |

**Public outputs**

`(new_balance_x1: Point, new_balance_x2: Point, agent_id: Field)` — the updated encrypted balance and the agent identifier.

**ABI byte layout (matches Rust contract)**

```
[0..64]    agent_pubkey            (x, y)
[64..192]  current_balance_ct      (x1.x, x1.y, x2.x, x2.y)
[192..224] token
[224..256] amount
[256..384] new_balance_ct  (OUTPUT)
[384..416] agent_id        (OUTPUT)
Total: 416 bytes
```

### Withdraw (`withdraw/src/main.nr`)

The interface is identical to `deposit`. The only behavioral difference is that the homomorphic update is a subtraction:

```
new_balance_ct = current_balance_ct - encrypt(agent_pubkey, amount, r_amount)
```

The ABI byte layout is the same (416 bytes).

### Transfer (`transfer/src/main.nr`)

```noir
fn main(
    // Private inputs
    sender_priv_key: Field,
    transfer_amount: Field,
    r_amount_sender: Field,
    r_amount_receiver: Field,
    sender_agent_id: Field,
    receiver_agent_id: Field,

    // Public inputs
    receiver_pubkey: pub Point,
    receiver_old_balance_x1: pub Point,
    receiver_old_balance_x2: pub Point,
    sender_pubkey: pub Point,
    sender_old_balance_x1: pub Point,
    sender_old_balance_x2: pub Point,
    token: pub Field
) -> pub (Point, Point, Point, Point, Field, Field)
```

**Private inputs**

| Input               | Type    | Description                                                       |
| ------------------- | ------- | ----------------------------------------------------------------- |
| `sender_priv_key`   | `Field` | Sender's ElGamal private key.                                     |
| `transfer_amount`   | `Field` | Confidential transfer amount.                                     |
| `r_amount_sender`   | `Field` | Randomness for encrypting the amount under the sender's key.      |
| `r_amount_receiver` | `Field` | Randomness for encrypting the amount under the receiver's key.    |
| `sender_agent_id`   | `Field` | Sender's agent identifier (exposed as a public output).           |
| `receiver_agent_id` | `Field` | Receiver's agent identifier (exposed as a public output).         |

**Public inputs**

| Input                     | Type    | Description                                              |
| ------------------------- | ------- | -------------------------------------------------------- |
| `receiver_pubkey`         | `Point` | Receiver's ElGamal public key.                           |
| `receiver_old_balance_x1` | `Point` | Receiver's current balance ciphertext, component `x1`.   |
| `receiver_old_balance_x2` | `Point` | Receiver's current balance ciphertext, component `x2`.   |
| `sender_pubkey`           | `Point` | Sender's ElGamal public key.                             |
| `sender_old_balance_x1`   | `Point` | Sender's current balance ciphertext, component `x1`.     |
| `sender_old_balance_x2`   | `Point` | Sender's current balance ciphertext, component `x2`.     |
| `token`                   | `Field` | Token contract identifier.                               |

**Public outputs**

```
(
  sender_new_balance_x1:   Point,
  sender_new_balance_x2:   Point,
  receiver_new_balance_x1: Point,
  receiver_new_balance_x2: Point,
  sender_agent_id:         Field,
  receiver_agent_id:       Field
)
```

**ABI byte layout (matches Rust contract)**

```
[0..64]    receiver_pubkey
[64..192]  receiver_current_balance
[192..256] sender_pubkey
[256..384] sender_current_balance
[384..416] token
[416..544] sender_new_balance     (OUTPUT)
[544..672] receiver_new_balance   (OUTPUT)
[672..704] sender_agent_id        (OUTPUT)
[704..736] receiver_agent_id      (OUTPUT)
Total: 736 bytes
```

> **Note:** the sender does **not** need the receiver's private key. The transfer amount is encrypted independently under both public keys; homomorphic addition is then performed under the receiver's key, and homomorphic subtraction under the sender's key.

## Circuit Logic

### Deposit / Withdraw

```
1. Range constraints
   ├─ amount   ≤ 2^40
   └─ agent_id ≤ 2^32

2. Key ownership
   └─ assert public_key(agent_priv_key) == agent_pubkey

3. Encrypt amount
   └─ amount_ct = encrypt(agent_pubkey, amount, r_amount)

4. Homomorphic update
   ├─ deposit:  new_balance_ct = current_balance_ct + amount_ct
   └─ withdraw: new_balance_ct = current_balance_ct - amount_ct
```

### Transfer

```
1. Range constraints
   ├─ transfer_amount   ≤ 2^40
   ├─ sender_agent_id   ≤ 2^32
   └─ receiver_agent_id ≤ 2^32

2. Sender key ownership
   └─ assert public_key(sender_priv_key) == sender_pubkey

3. Encrypt under both keys
   ├─ transfer_sender_ct   = encrypt(sender_pubkey,   transfer_amount, r_amount_sender)
   └─ transfer_receiver_ct = encrypt(receiver_pubkey, transfer_amount, r_amount_receiver)

4. Homomorphic update
   ├─ sender_new_balance   = sender_old_balance   - transfer_sender_ct
   └─ receiver_new_balance = receiver_old_balance + transfer_receiver_ct
```

## Cryptographic Details

### Encryption scheme

Exponential ElGamal on the BabyJub curve:

- `x1 = r·G`
- `x2 = r·H + m·G`

Where `G` is the BabyJub generator, `H` is the recipient's public key, `r` is fresh randomness, and `m` is the plaintext.

### Homomorphism

ElGamal is additively homomorphic when both operands are encrypted under the same key:

```
Enc_H(a) + Enc_H(b) = Enc_H(a + b)
Enc_H(a) - Enc_H(b) = Enc_H(a - b)
```

For `transfer`, two independent encryptions of `transfer_amount` are produced so the sender and receiver balances can each be updated under their own key.

### Range bounds

All amounts are constrained to fit in 40 bits (≈ 1.1 trillion units). All `agent_id`s are constrained to 32 bits. These bounds keep range proofs efficient and prevent overflow in homomorphic operations.

## Building and Testing

Compile every circuit in the workspace:

```bash
cd wallet_proof
nargo compile
```

Compiled artifacts land in `target/<circuit>.json`.

Run all Noir tests:

```bash
nargo test
```

Existing tests include:

- `deposit::test_deposit_basic`, `test_deposit_zero_balance`
- `withdraw::test_withdraw_basic`
- `transfer::test_transfer_basic`, `test_transfer_to_zero_balance`

## Generating Proofs from JavaScript

The workspace ships with `package.json` already wired for proof generation:

```bash
npm install
```

Dependencies include `@noir-lang/noir_js`, `@noir-lang/backend_barretenberg`, and `@aztec/bb.js`.

A minimal proving flow (using `deposit` as an example):

```ts
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import circuit from "./target/deposit.json" assert { type: "json" };

const backend = new BarretenbergBackend(circuit);
const noir = new Noir(circuit, backend);

const inputs = {
  agent_priv_key: "0x...",
  r_amount: "0x...",
  agent_id: "7",
  agent_pubkey: { x: "0x...", y: "0x..." },
  current_balance_x1: { x: "0x...", y: "0x..." },
  current_balance_x2: { x: "0x...", y: "0x..." },
  token: "0x...",
  amount: "300",
};

const { witness } = await noir.execute(inputs);
const proof = await backend.generateProof(witness);
const publicInputs = await backend.generatePublicInputs(witness);
```

For `transfer`, swap the circuit JSON and use the transfer input shape described above.

## Solidity Verifiers

Pre-generated verifier contracts live in `contracts/`:

- `DepositVerifier.sol`
- `WithdrawVerifier.sol`
- `TransferVerifier.sol`

To regenerate them from the compiled circuits, run:

```bash
node generate-verifier.mjs
```

## Security Considerations

1. **Fresh randomness.** Never reuse `r_amount`, `r_amount_sender`, or `r_amount_receiver` across encryptions. Reuse leaks plaintext relationships.
2. **Private key protection.** Private keys are passed as witnesses; they are used only to prove ownership of the public key and must never leave the proving environment.
3. **Key consistency.** Homomorphic addition / subtraction is only valid when both ciphertexts are encrypted under the same key. The circuits enforce this by construction.
4. **Range bounds.** All amounts and `agent_id`s are range-constrained inside the circuit; do not bypass these checks in client code.
5. **Public `amount` on deposit/withdraw.** This is intentional: the contract must move plaintext ERC-20 funds. The confidential balance update around it is still proven in zero knowledge.

### Attacks prevented

- **Balance inflation / forgery** — the homomorphic update is enforced by the circuit and the verifier.
- **Amount overflow** — 40-bit range constraints prevent overflow in homomorphic operations.
- **Key substitution** — public keys are public inputs and bound to the proof; the contract checks them against on-chain state.
- **Sender impersonation** — the circuit asserts `public_key(sender_priv_key) == sender_pubkey`.

## References

- Noir Language — https://noir-lang.org
- ElGamal Encryption — https://en.wikipedia.org/wiki/ElGamal_encryption
- BabyJub Curve — https://eips.ethereum.org/EIPS/eip-2494
- Barretenberg Backend — https://github.com/AztecProtocol/barretenberg
