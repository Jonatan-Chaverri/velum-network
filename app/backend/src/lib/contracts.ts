/**
 * Helpers to resolve on-chain contract addresses from environment variables.
 *
 * Contract addresses are configured via env vars (e.g. CONFIDENTIAL_ERC20_ADDRESS)
 * instead of being looked up in the database. This keeps deploys and local dev
 * decoupled from the Supabase `contracts` table.
 */

export function getConfidentialErc20Address(): string {
  const address = process.env.CONFIDENTIAL_ERC20_ADDRESS;
  if (!address) {
    throw new Error('CONFIDENTIAL_ERC20_ADDRESS environment variable is not set');
  }
  return address;
}

export function getWethTokenAddress(): string {
  const address = process.env.WETH_TOKEN_ADDRESS;
  if (!address) {
    throw new Error('WETH_TOKEN_ADDRESS environment variable is not set');
  }
  return address;
}
