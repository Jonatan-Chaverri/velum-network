# zkWallet Transfer Proof Circuit

Zero-knowledge proof circuit for confidential balance updates in the zkWallet system.

## Overview

This Noir circuit proves that a confidential token transfer is valid without revealing:
- Sender's current balance
- Transfer amount
- Sender's new balance
- Randomness used in encryptions

**What the circuit proves:**
1. Sender has sufficient balance for the transfer
2. Transfer amount is encrypted correctly under both sender and recipient keys
3. New balance is computed correctly using homomorphic subtraction
4. All amounts are within valid range (≤ 2^40)
5. Transaction is bound to specific context (anti-replay)

## Circuit Interface

### Private Inputs (Witness)

These values are known only to the prover and never revealed:

| Input | Type | Description | Example |
|-------|------|-------------|---------|
| `current_balance` | `Field` | Sender's current balance | `1000` |
| `transfer_amount` | `Field` | Amount being transferred | `100` |
| `r_old_balance` | `Field` | Randomness for old balance encryption | `0x1a2b3c...` |
| `r_transfer_sender` | `Field` | Randomness for transfer under sender's key | `0x4d5e6f...` |
| `r_transfer_recipient` | `Field` | Randomness for transfer under recipient's key | `0x7g8h9i...` |

### Public Inputs

These values are visible to everyone and included in the proof:

| Input | Type | Description |
|-------|------|-------------|
| `sender_pubkey` | `EmbeddedCurvePoint` | Sender's ElGamal public key |
| `old_balance_x1` | `EmbeddedCurvePoint` | Old balance ciphertext part 1 (r·G) |
| `old_balance_x2` | `EmbeddedCurvePoint` | Old balance ciphertext part 2 (r·H + m·G) |
| `new_balance_x1` | `EmbeddedCurvePoint` | New balance ciphertext part 1 |
| `new_balance_x2` | `EmbeddedCurvePoint` | New balance ciphertext part 2 |
| `transfer_sender_x1` | `EmbeddedCurvePoint` | Transfer under sender key, part 1 |
| `transfer_sender_x2` | `EmbeddedCurvePoint` | Transfer under sender key, part 2 |
| `transfer_recipient_x1` | `EmbeddedCurvePoint` | Transfer under recipient key, part 1 |
| `transfer_recipient_x2` | `EmbeddedCurvePoint` | Transfer under recipient key, part 2 |
| `recipient_pubkey` | `EmbeddedCurvePoint` | Recipient's ElGamal public key |
| `from` | `Field` | Sender address |
| `to` | `Field` | Recipient address |
| `token` | `Field` | Token contract address |
| `chainId` | `Field` | Chain ID (e.g., 42161 for Arbitrum) |
| `methodTag` | `Field` | Method identifier |

## Cryptographic Details

### Encryption Scheme

**ElGamal on BabyJub Curve (Exponential Variant)**

Ciphertext structure: `(x1, x2)` where:
- `x1 = r·G` (ephemeral key)
- `x2 = r·H + m·G` (encrypted message)

Where:
- `G` = BabyJub generator point
- `H` = recipient's public key
- `r` = random scalar (must be fresh for each encryption!)
- `m` = plaintext message

### Homomorphic Property

ElGamal supports additive homomorphism:
```
Enc_H(a) + Enc_H(b) = Enc_H(a + b)
Enc_H(a) - Enc_H(b) = Enc_H(a - b)
```

**CRITICAL:** Homomorphic operations only work when both ciphertexts are encrypted under the SAME public key!

This is why we need TWO transfer ciphertexts:
- `transfer_sender_ct`: Encrypted under sender's key (for homomorphic subtraction)
- `transfer_recipient_ct`: Encrypted under recipient's key (for delivery)

### Range Constraints

**Single-limb strategy with 40-bit bounds**

All amounts constrained to: `0 ≤ value ≤ 2^40 - 1`

**Rationale:**
- 40 bits = ~1.1 trillion units
- Sufficient for most token amounts with reasonable decimals
- Small enough for efficient range proofs
- Prevents overflow attacks in homomorphic operations

**Implementation:**
```noir
current_balance.assert_max_bit_size::<40>();
transfer_amount.assert_max_bit_size::<40>();
expected_new_balance.assert_max_bit_size::<40>();
```

### Domain Binding

Proof is cryptographically bound to transaction context:
- `from`: Sender address (prevents sender impersonation)
- `to`: Recipient address (prevents recipient substitution)
- `token`: Token contract (prevents cross-token replay)
- `chainId`: Blockchain ID (prevents cross-chain replay)
- `methodTag`: Method identifier (prevents cross-method replay)

These fields are public inputs, so the verifier checks they match the transaction.

## Circuit Logic Flow

```
1. Range Constraints
   ├─ current_balance ≤ 2^40
   ├─ transfer_amount ≤ 2^40
   └─ Check: current_balance - transfer_amount ≥ 0 (sufficient balance)

2. Verify Old Balance
   └─ Assert: encrypt(sender_pubkey, current_balance, r_old) == old_balance_ct

3. Verify Transfer Encryption (Sender Key)
   └─ Assert: encrypt(sender_pubkey, transfer_amount, r_transfer_sender) == transfer_sender_ct

4. Verify Transfer Encryption (Recipient Key)
   └─ Assert: encrypt(recipient_pubkey, transfer_amount, r_transfer_recipient) == transfer_recipient_ct

5. Verify Homomorphic Balance Update
   └─ Assert: old_balance_ct - transfer_sender_ct == new_balance_ct

6. Verify New Balance Range
   └─ Assert: (current_balance - transfer_amount) ≤ 2^40
```

## Encoding and Data Types

### Field Elements

All scalar values encoded as `Field` (BN254 scalar field):
- Modulus: `21888242871839275222246405745257275088548364400416034343698204186575808495617`
- 254 bits
- Addresses should be encoded as Field by converting from bytes

### Elliptic Curve Points

Type: `EmbeddedCurvePoint` (BabyJub curve)

Structure:
```noir
{
    x: Field,           // x-coordinate
    y: Field,           // y-coordinate
    is_infinite: bool   // true if point at infinity
}
```

**Encoding from JavaScript:**
```typescript
// Example point encoding
const point = {
    x: "0x1234...",  // hex string or bigint
    y: "0x5678...",
    is_infinite: false
};
```

### Ciphertext Encoding

Each ciphertext is TWO points: `(x1, x2)`

From JavaScript, split into 4 separate point parameters:
```typescript
// Ciphertext
const ct = { x1: Point, x2: Point };

// Pass to circuit as:
old_balance_x1: ct.x1,
old_balance_x2: ct.x2
```

## Integration Guide

### Step 1: Compile Circuit

```bash
cd wallet_proof
nargo compile
```

Output: `target/wallet_proof.json` (compiled circuit)

### Step 2: Set Up NoirJS

```bash
npm install @noir-lang/noir_js @noir-lang/backend_barretenberg
```

### Step 3: Generate Proof (TypeScript)

```typescript
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import circuit from './circuits/wallet_proof.json';

const backend = new BarretenbergBackend(circuit);
const noir = new Noir(circuit, backend);

// Prepare inputs (match circuit interface)
const inputs = {
    current_balance: "1000",
    transfer_amount: "100",
    r_old_balance: "0x...",
    r_transfer_sender: "0x...",
    r_transfer_recipient: "0x...",
    sender_pubkey: { x: "0x...", y: "0x...", is_infinite: false },
    // ... all other public inputs
};

// Generate proof
const { witness } = await noir.execute(inputs);
const proof = await backend.generateProof(witness);
const publicInputs = await backend.generatePublicInputs(witness);
```

### Step 4: Send to Smart Contract

```typescript
// Call Stylus contract
await contract.confidential_transfer(
    newBalanceCiphertext,
    transferRecipientCiphertext,
    publicInputs,
    proof
);
```

See `INTEGRATION_GUIDE.md` for complete integration instructions.

## Security Considerations

### Critical Requirements

1. **Fresh Randomness**: NEVER reuse `r` values across encryptions
   - Reusing randomness leaks plaintext differences
   - Use cryptographically secure random number generator
   - Generate new `r` for every encryption

2. **Key Consistency**: Homomorphic operations require same public key
   - `old_balance_ct` encrypted under `sender_pubkey`
   - `transfer_sender_ct` encrypted under `sender_pubkey`
   - This allows: `old_balance_ct - transfer_sender_ct = new_balance_ct`

3. **Private Key Protection**: Never include private keys in circuit
   - Circuit only uses public keys
   - Private keys stay client-side for decryption only

4. **Range Bounds**: All amounts must fit in 40 bits
   - Prevents overflow in homomorphic operations
   - Enforced by circuit constraints

### Attack Vectors Prevented

- **Insufficient Balance**: Circuit checks `current_balance - transfer_amount` doesn't underflow
- **Balance Inflation**: Homomorphic check ensures new balance is correctly computed
- **Amount Overflow**: Range constraints prevent values > 2^40
- **Replay Attacks**: Domain binding ties proof to specific transaction context
- **Key Substitution**: Public keys are public inputs, verified by contract

## Testing

Run circuit tests:
```bash
nargo test
```

Tests included:
- `test_valid_transfer`: Happy path with valid inputs
- `test_homomorphic_subtraction`: Verify homomorphic property
- `test_wrong_new_balance_fails`: Attack attempt (should fail)

See `TESTING_GUIDE.md` for comprehensive testing strategies.

## Performance Characteristics

**Proof Generation Time**: ~2-5 seconds (browser)
**Proof Size**: ~1-2 KB
**Public Input Size**: ~1-2 KB
**Verification Gas**: ~250-500k gas (on-chain)

## Limitations

1. **Single-limb only**: Amounts limited to 2^40 (~1.1 trillion)
   - For larger amounts, multi-limb extension needed
2. **Sender balance only**: Circuit doesn't update recipient balance
   - Recipient receives encrypted transfer, updates separately
3. **No batch transfers**: One transfer per proof
   - Could be extended for batch operations

## References

- **Noir Language**: https://noir-lang.org
- **ElGamal Encryption**: https://en.wikipedia.org/wiki/ElGamal_encryption
- **BabyJub Curve**: https://eips.ethereum.org/EIPS/eip-2494
- **Barretenberg Backend**: https://github.com/AztecProtocol/barretenberg
- **Task Specification**: https://github.com/Jonatan-Chaverri/arg25-Projects/issues/1