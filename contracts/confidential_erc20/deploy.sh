#!/bin/bash
# Deploy the confidential ERC20 contract to the Stylus testnet
# Usage: ./deploy.sh [--test]
# --test: Run cargo stylus check instead of deploy
set -e

# Load environment variables
set -a
source .env
set +a

# Check if --test option is passed
if [[ "$1" == "--test" ]]; then
  cargo stylus check \
    --endpoint="$RPC_URL"
else
  cargo stylus deploy \
    --endpoint="$RPC_URL" \
    --private-key="$ACCOUNT_PRIVATE_KEY" \
    --max-fee-per-gas-gwei="${MAX_FEE_PER_GAS_GWEI:-0.2}"
fi