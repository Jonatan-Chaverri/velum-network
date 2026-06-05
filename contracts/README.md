# Velum Network — Smart Contracts

This directory holds every on-chain component of Velum Network and the tooling required to deploy and bootstrap them. The contracts are intended to run on **Arbitrum Sepolia** (Stylus-enabled).

## Layout

```
contracts/
├── confidential_erc20/   Arbitrum Stylus (Rust) custody contract
├── verifier/             Hardhat project — Solidity Noir verifiers
└── test_contracts/       Hardhat scripts — initialization & integration tests
```

| Subdirectory                                               | Purpose                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| [confidential_erc20](confidential_erc20/README.md)         | Stylus-based confidential ERC-20 custody contract.                      |
| [verifier](verifier/README.md)                             | Deploys the three Noir-generated Solidity verifiers (deposit, withdraw, transfer). |
| [test_contracts](test_contracts/README.md)                 | Initializes `confidential_erc20` and exercises its endpoints end-to-end. |

## Deployment Order

The contracts must be deployed and wired together in this exact order:

1. **Deploy the three Noir verifiers** from `verifier/`.
2. **Deploy the `confidential_erc20` Stylus contract** from `confidential_erc20/`.
3. **Initialize `confidential_erc20`** with the verifier addresses using the `initialize` script in `test_contracts/`.

The diagram below summarises the wiring:

```text
verifier/                       confidential_erc20/
 ├── DepositVerifier ─┐
 ├── WithdrawVerifier ─┼──►  init(deposit, withdraw, transfer)
 └── TransferVerifier ─┘                  ▲
                                          │
                              test_contracts/scripts/initialize.js
```

## Prerequisites

- Node.js 18+ and npm
- Rust toolchain (managed by `rust-toolchain.toml` inside `confidential_erc20/`)
- [`cargo-stylus`](https://github.com/OffchainLabs/cargo-stylus): `cargo install --force cargo-stylus cargo-stylus-check`
- The `wasm32-unknown-unknown` Rust target: `rustup target add wasm32-unknown-unknown`
- An Arbitrum Sepolia RPC URL and a funded deployer private key

## Step 1 — Deploy the Verifiers

```bash
cd verifier
npm install

# Configure environment
cp .env.example .env   # if present, otherwise create manually
# .env must contain:
#   RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
#   ACCOUNT_PRIVATE_KEY=<deployer key without 0x prefix>

npm run compile
npm run deploy:all
```

`deploy:all` runs `scripts/deploy-all.js`, which deploys `DepositVerifier`, `WithdrawVerifier`, and `TransferVerifier` against the `sepolia` network. The resulting addresses are written to `deployments.json` and also printed to the console.

Copy the three addresses; you will reuse them in Step 3.

## Step 2 — Deploy `confidential_erc20`

```bash
cd ../confidential_erc20

# Configure environment
cp .env.example .env
# .env must contain:
#   RPC_URL=<arbitrum sepolia rpc>
#   ACCOUNT_PRIVATE_KEY=<deployer key>
#   # optional:
#   MAX_FEE_PER_GAS_GWEI=0.2

# (Optional) sanity-check the WASM build without sending a tx
./deploy.sh --test

# Deploy
./deploy.sh
```

`deploy.sh` wraps `cargo stylus deploy` with the values from `.env`. It performs both the deploy and activation transactions and prints the final contract address. Record this as `CONFIDENTIAL_ERC20_ADDRESS`.

See [confidential_erc20/README.md](confidential_erc20/README.md) for the contract ABI, agent model, and proof-input layouts.

## Step 3 — Initialize the Contract

`confidential_erc20` ships uninitialized. The `test_contracts/` project contains the script that wires the verifiers to the custody contract.

```bash
cd ../test_contracts
npm install

# Configure environment
cp .env.example .env
# .env must contain:
#   ACCOUNT_PRIVATE_KEY=<owner key, same one that deployed the Stylus contract>
#   CONFIDENTIAL_ERC20_ADDRESS=<address from Step 2>
#   DEPOSIT_VERIFIER_ADDRESS=<address from Step 1>
#   WITHDRAW_VERIFIER_ADDRESS=<address from Step 1>
#   TRANSFER_VERIFIER_ADDRESS=<address from Step 1>
#   WETH_TOKEN_ADDRESS=<WETH token used by the contract>

npm run initialize
```

The script:

- Detects whether the contract has already been initialized.
- If uninitialized, calls `init(depositVerifier, withdrawVerifier, transferVerifier)`.
- If already initialized, calls `setVerifier(...)` to replace the existing verifier addresses (owner-only).

After this step the deployment is live and ready to accept agent registrations and confidential operations.

## Step 4 (Optional) — Run the Integration Tests

The same project includes a full end-to-end test that registers an agent, deposits, withdraws, and verifies that invalid proofs are rejected:

```bash
cd test_contracts
npm run test_erc20
```

See [test_contracts/README.md](test_contracts/README.md) for details and troubleshooting.

## Upgrading or Redeploying

- **Replacing a verifier** — redeploy from `verifier/`, then re-run `npm run initialize` in `test_contracts/`; it will call `setVerifier` since the contract is already initialized.
- **Replacing the custody contract** — redeploy from `confidential_erc20/`, update `CONFIDENTIAL_ERC20_ADDRESS` in `test_contracts/.env`, and run `npm run initialize` again to wire it to the existing verifiers.
- **Transferring ownership** — call `transferOwnership(newOwner)` on the custody contract. Only the new owner can submit `transferConfidential` afterwards.

## Network Notes

All three subprojects default to Arbitrum Sepolia:

- RPC: `https://sepolia-rollup.arbitrum.io/rpc`
- Hardhat network name: `sepolia` (defined in each `hardhat.config.js`)
- Stylus deployment uses the `RPC_URL` in `confidential_erc20/.env`

To target a different network, update the corresponding `.env` files and the `networks` block in each `hardhat.config.js`.
