// viem is consumed via require() across this backend: it ships raw TS sources
// (ox) that fail type-checking under our TS config when imported as ESM.
const { createPublicClient, createWalletClient, http, parseAbi, parseEventLogs } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

// ERC-8004 IdentityRegistry (official reference implementation, deployed by us
// on Arbitrum Sepolia behind a UUPS proxy). Each registered agent is an ERC-721
// token whose tokenURI resolves to the agent card served by this backend.
const identityRegistryAbi = parseAbi([
  'function register(string agentURI) returns (uint256 agentId)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
]);

export function getErc8004RegistryAddress(): `0x${string}` | null {
  const address = process.env.ERC8004_IDENTITY_REGISTRY;
  return address ? (address as `0x${string}`) : null;
}

export function getErc8004ExplorerUrl(erc8004AgentId: bigint): string | null {
  const registry = getErc8004RegistryAddress();
  if (!registry) {
    return null;
  }
  return `https://sepolia.arbiscan.io/nft/${registry}/${erc8004AgentId.toString()}`;
}

/**
 * Register an agent in the ERC-8004 IdentityRegistry. The minted identity NFT
 * is owned by the platform wallet; `agentURI` points at the public agent card
 * endpoint so explorers and other agents can resolve the agent's metadata.
 *
 * Returns the on-chain ERC-8004 agentId and tx hash, or null when the registry
 * is not configured. Throws on chain errors — callers decide whether that is
 * fatal (we treat it as best-effort during agent creation).
 */
export async function registerAgentErc8004(agentCardUrl: string): Promise<
  { erc8004AgentId: bigint; txHash: string } | null
> {
  const registry = getErc8004RegistryAddress();
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.ACCOUNT_PRIVATE_KEY as `0x${string}` | undefined;

  if (!registry || !rpcUrl || !privateKey) {
    console.warn('[erc8004] registry, RPC_URL or ACCOUNT_PRIVATE_KEY not configured; skipping registration');
    return null;
  }

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpcUrl) });

  const { request } = await publicClient.simulateContract({
    account,
    address: registry,
    abi: identityRegistryAbi,
    functionName: 'register',
    args: [agentCardUrl],
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success') {
    throw new Error(`ERC-8004 registration reverted: ${txHash}`);
  }

  const [registered] = parseEventLogs({
    abi: identityRegistryAbi,
    eventName: 'Registered',
    logs: receipt.logs,
  });

  if (!registered) {
    throw new Error(`ERC-8004 Registered event not found in receipt: ${txHash}`);
  }

  return {
    erc8004AgentId: registered.args.agentId,
    txHash,
  };
}
