# Confidential ERC20 Contract

A confidential ERC-20 custody contract built for **Arbitrum Stylus** that enables private token transfers using ElGamal encryption (Grumpkin Curve) and Noir-generated zero-knowledge proofs.

## Overview

This contract provides confidential token custody and transfers by:
- Storing encrypted balances on-chain using ElGamal encryption over the Grumpkin curve
- Verifying zero-knowledge proofs generated off-chain using Noir circuits
- Enabling private deposits, withdrawals, and peer-to-peer transfers without revealing amounts
- All cryptographic operations (encryption, decryption, homomorphic operations) happen off-chain in Noir circuits

## Current Deployment

**Network:** Arbitrum Sepolia  
**Contract Address:** `0x336bc4a67ff73d344be197b335ea338dc894087a`

## Architecture

### Design Principles

- **Off-chain cryptography**: All cryptographic math (ElGamal, Grumpkin Curve operations, homomorphic add/sub, comparisons) happens off-chain inside Noir circuits
- **On-chain verification**: The contract only:
  - Stores ciphertexts (as raw bytes)
  - Verifies Noir proofs with domain separation
  - Updates balances using new ciphertexts provided by the proof
  - Manages ERC-20 custody (deposit/withdraw)

### Supported Tokens

Currently supports **WETH** (Wrapped Ether) at address `0x2836ae2ea2c013acd38028fd0c77b92cccfa2ee4` on Arbitrum Sepolia.

## Public Endpoints

### Initialization & Setup

#### `init(deposit_verifier, withdraw_verifier, transfer_verifier)`
One-time initialization that sets up the verifier contracts and owner. Can only be called once.

#### `registerUserPk(public_key: [u8; 64])`
Registers a user's public key (64 bytes representing a point on the Grumpkin curve). Must be called before any deposits or transfers. Sets initial encrypted balance to zero.

### User Operations

#### `deposit(proof_inputs: Vec<u8>, proof: bytes)`
Deposits plain ERC-20 tokens into confidential custody. Requires:
- A valid Noir proof proving the encrypted balance update
- Public inputs: user_pubkey, current_balance (ciphertext), new_balance (ciphertext), user_address, token, amount
- The user must have approved the contract to transfer tokens on their behalf

#### `withdraw(proof_inputs: Vec<u8>, proof: bytes)`
Withdraws plain ERC-20 tokens from confidential custody. Requires:
- A valid Noir proof proving the encrypted balance update
- Public inputs: user_pubkey, current_balance (ciphertext), new_balance (ciphertext), user_address, token, amount

#### `transferConfidential(proof_inputs: Vec<u8>, proof: bytes)`
Transfers tokens confidentially between two users. Both sender and receiver must be registered. Requires:
- A valid Noir proof proving both balance updates
- Public inputs: receiver_address, receiver_pubkey, receiver_current_balance, receiver_new_balance, sender_pubkey, sender_current_balance, sender_new_balance, token

### View Functions

#### `balanceOfEnc(token: address, user: address) -> [u8; 128]`
Returns the encrypted balance ciphertext for a given token and user. Only the user with the corresponding private key can decrypt this.

#### `getUserPk(user: address) -> [u8; 64]`
Returns the registered public key for a user (or zeros if not registered).

#### `isSupportedToken(token: address) -> bool`
Checks if a token is supported by the contract.

#### `getDepositVerifier() -> address`
Returns the address of the deposit verifier contract.

#### `getWithdrawVerifier() -> address`
Returns the address of the withdraw verifier contract.

#### `getTransferVerifier() -> address`
Returns the address of the transfer verifier contract.

#### `getOwner() -> address`
Returns the contract owner address.

### Admin Functions

#### `setVerifier(deposit_verifier, withdraw_verifier, transfer_verifier)`
Updates the verifier contract addresses. Only callable by the owner.

## Deployment

### Prerequisites

- Rust toolchain (configured via `rust-toolchain.toml`)
- `cargo-stylus` CLI tool
- Environment variables configured (see `.env.example`)

### Environment Setup

Create a `.env` file in the contract directory with the following variables:

```bash
RPC_URL=<your_arbitrum_sepolia_rpc_url>
ACCOUNT_PRIVATE_KEY=<your_deployer_private_key>
```

### Deploy Script

The contract includes a deployment script (`deploy.sh`) that handles the deployment process:

```bash
# Make the script executable
chmod +x deploy.sh

# Deploy to Arbitrum Sepolia
./deploy.sh

# Or check the contract without deploying
./deploy.sh --test
```

The script will:
1. Load environment variables from `.env`
2. Run `cargo stylus deploy` with the configured RPC endpoint and private key
3. Deploy the contract and return the contract address

### Post-Deployment

After deployment, you must:

1. **Initialize the contract** by calling `init()` with the addresses of your Noir verifier contracts:
   - `deposit_verifier`: Verifier for deposit proofs
   - `withdraw_verifier`: Verifier for withdraw proofs
   - `transfer_verifier`: Verifier for transfer proofs

2. **Register users** by having each user call `registerUserPk()` with their Grumpkin curve public key


## Proof Format

### Deposit/Withdraw Proof Inputs (416 bytes)

The proof inputs are structured as:
- `[0..64)`: user_pubkey (64 bytes)
- `[64..192)`: current_balance ciphertext (128 bytes: x1, y1, x2, y2)
- `[192..224)`: user_address (20 bytes, padded)
- `[224..256)`: token address (20 bytes, padded)
- `[256..288)`: amount (32 bytes, big-endian U256)
- `[288..416)`: new_balance ciphertext (128 bytes: x1, y1, x2, y2)

### Transfer Proof Inputs (704 bytes)

The proof inputs are structured as:
- `[0..32)`: receiver_address (20 bytes, padded)
- `[32..96)`: receiver_pubkey (64 bytes)
- `[96..224)`: receiver_current_balance (128 bytes)
- `[224..288)`: sender_pubkey (64 bytes)
- `[288..416)`: sender_current_balance (128 bytes)
- `[416..448)`: token address (20 bytes, padded)
- `[448..576)`: sender_new_balance (128 bytes)
- `[576..704)`: receiver_new_balance (128 bytes)

As you can see the amount being transfer is hidden, achieving confidentiality.

## Security Features

- **Reentrancy protection**: All state-changing functions are protected by a reentrancy guard
- **Proof verification**: All operations require valid Noir ZK proofs
- **Balance consistency**: Current balances are verified against stored ciphertexts before updates
- **Public key validation**: User public keys are validated against registered keys
- **Nullifier system**: Prevents replay attacks (implemented via proof verification)

## Events

- `TransferConfidential(token, from, to)`: Emitted on confidential transfers
- `Deposit(token, user_address)`: Emitted on deposits
- `Withdraw(token, user_address)`: Emitted on withdrawals
- `VerifierUpdated(deposit_verifier, withdraw_verifier, transfer_verifier)`: Emitted when verifiers are updated
- `TokenAllowlistUpdated(token, allowed)`: Emitted when token allowlist is updated
- `UserPkRegistered(user, pk)`: Emitted when a user registers their public key

## Technical Details

### Encryption Scheme

- **Curve**: Grumpkin curve (BabyJubjub)
- **Encryption**: ElGamal encryption
- **Zero point**: The generator point `G` represents zero balance
  - `G_GENERATOR_X = 1`
  - `G_GENERATOR_Y = sqrt(-16)`

### Amount Scaling

Due to ElGamal constraints (amounts must fit in 40 bits), amounts are scaled by a factor of `10^6` when processing deposits/withdrawals.

### Storage Layout

- Encrypted balances stored as four separate mappings (x1, y1, x2, y2) for each (token, user) pair
- Public keys stored as separate x and y coordinates
- Nullifiers tracked to prevent replay attacks
