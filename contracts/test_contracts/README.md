# Test Contracts

This directory contains Hardhat scripts and utilities for testing the `confidential_erc20` contract. It provides methods to interact with the contract, test its functionality, and initialize it from scratch.

## Overview

The `test_contracts` project is a Hardhat-based testing suite that enables:

- **Contract Initialization**: Initialize the `confidential_erc20` contract with verifier addresses
- **Contract Testing**: Test deposit, withdraw, and transfer operations
- **Key Management**: Generate and manage user keypairs for confidential transactions
- **Proof Generation**: Generate and validate zero-knowledge proofs for confidential operations

## Prerequisites

- Node.js and npm installed
- Hardhat configured
- Access to a blockchain network (default: Sepolia)
- Deployed `confidential_erc20` contract address
- Deployed verifier contract addresses

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in this directory with the following variables:
```env
# Account configuration
ACCOUNT_PRIVATE_KEY=your_private_key_here

# Contract addresses
CONFIDENTIAL_ERC20_ADDRESS=0x...
WETH_TOKEN_ADDRESS=0x...

# Verifier addresses (required for initialization)
DEPOSIT_VERIFIER_ADDRESS=0x...
WITHDRAW_VERIFIER_ADDRESS=0x...
TRANSFER_VERIFIER_ADDRESS=0x...
```

3. Ensure the ABI file is available at `abis/confidential_erc20_abi_flat.txt`

## Scripts

### Initialize Contract

Initialize the `confidential_erc20` contract from scratch. This script will:

- Check if the contract is already initialized
- If not initialized, call `init()` with the verifier addresses from your `.env` file
- If already initialized, update the verifier addresses using `setVerifier()`

```bash
npm run initialize
```

**Note**: This script requires the following environment variables:
- `CONFIDENTIAL_ERC20_ADDRESS`
- `DEPOSIT_VERIFIER_ADDRESS`
- `WITHDRAW_VERIFIER_ADDRESS`
- `TRANSFER_VERIFIER_ADDRESS`

### Test ERC20 Contract

Run comprehensive tests on the confidential ERC20 contract, including:

- User registration with public key generation
- Deposit operations with zero-knowledge proofs
- Withdraw operations with zero-knowledge proofs
- Balance verification
- Invalid proof rejection testing

```bash
npm run test_erc20
```

This script will:
1. Initialize the contract if needed
2. Register a user public key (or use existing)
3. Test deposit functionality
4. Test withdraw functionality
5. Verify that invalid proofs are rejected

### Parse ABI

Parse and format the contract ABI:

```bash
npm run parse_abi
```

## Project Structure

```
test_contracts/
├── abis/                    # Contract ABIs
│   ├── confidential_erc20_abi.json
│   └── confidential_erc20_abi_flat.txt
├── scripts/
│   ├── initialize.js        # Contract initialization script
│   ├── confidential_erc20.js # Main testing script
│   ├── utils.js             # Key generation utilities
│   ├── prover_mock.js       # Mock proof generation
│   └── verifier_mock.js     # Mock verifier
├── hardhat.config.js        # Hardhat configuration
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## Key Features

### User Key Management

The project includes utilities for generating and managing user keypairs:

- **Key Generation**: Uses Aztec's Grumpkin scalar and Schnorr signatures
- **Key Storage**: Secret keys are stored locally in `secret_key.txt`
- **Public Key Format**: 64-byte public keys (32 bytes x-coordinate + 32 bytes y-coordinate)

### Zero-Knowledge Proof Testing

The testing suite includes mock provers and verifiers for:

- Deposit proofs
- Withdraw proofs
- Transfer proofs (planned)

### Network Configuration

By default, the project is configured to use Sepolia testnet via Arbitrum rollup. You can modify the network settings in `hardhat.config.js`.

## Usage Examples

### Initializing a New Contract

1. Deploy your `confidential_erc20` contract
2. Deploy your verifier contracts (deposit, withdraw, transfer)
3. Set the addresses in your `.env` file
4. Run `npm run initialize`

### Testing Contract Functionality

1. Ensure the contract is initialized
2. Make sure you have WETH tokens (or configure for your token)
3. Run `npm run test_erc20`

## Troubleshooting

- **"Contract already initialized"**: The contract owner is already set. Use `setVerifier()` to update verifier addresses.
- **"Balance is zero after deposit"**: Check that the deposit proof was generated correctly and the verifier accepted it.
- **Network errors**: Verify your RPC endpoint and network configuration in `hardhat.config.js`.

## Notes

- The project uses mock provers and verifiers for testing. In production, you should use actual zero-knowledge proof systems.
- Secret keys are stored in plain text files. Use with caution and never commit these files to version control.
- The scripts are configured for Sepolia testnet by default. Modify the network configuration for other networks.

