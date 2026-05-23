# UltraVerifier Deployment

This folder contains the Hardhat setup for deploying the `HonkVerifier` contract from `UltraVerifier.sol`.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
# Network Configuration
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Account Private Key (without 0x prefix)
ACCOUNT_PRIVATE_KEY=your_private_key_here

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## Usage

### Compile the contract
```bash
npm run compile
```

### Deploy to local Hardhat network
```bash
npm run deploy
```

### Deploy to Sepolia testnet
```bash
npm run deploy:sepolia
```

### Verify contract on Etherscan
```bash
npm run verify <CONTRACT_ADDRESS>
```

## Scripts

- `compile`: Compile the Solidity contracts
- `deploy`: Deploy to local Hardhat network
- `deploy:sepolia`: Deploy to Sepolia testnet
- `verify`: Verify contract on Etherscan

## Network Configuration

The Hardhat config supports:
- **hardhat**: Local development network
- **localhost**: Local node at http://127.0.0.1:8545
- **sepolia**: Sepolia testnet (Arbitrum rollup)
