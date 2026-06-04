import { getConfidentialErc20Address } from './contracts';

const { createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const confidentialErc20Abi = parseAbi([
  'function register_agent_pk(uint8[64] public_key, uint32 agent_id)',
]);

function publicKeyHexToBytes(publicKey: string) {
  const normalized = publicKey.trim().replace(/^0x/, '');

  if (normalized.length !== 128) {
    throw new Error('publicKey must be a 64-byte hex string');
  }

  const bytes = normalized.match(/.{1,2}/g)?.map((value) => Number.parseInt(value, 16));

  if (!bytes || bytes.length !== 64 || bytes.some(Number.isNaN)) {
    throw new Error('publicKey could not be converted to 64 bytes');
  }

  return bytes;
}

export async function registerAgentPublicKeyOnChain(params: {
  publicKey: string;
  agentId: bigint;
}) {
  const rpcUrl = process.env.RPC_URL;
  const accountPrivateKey = process.env.ACCOUNT_PRIVATE_KEY;

  if (!rpcUrl) {
    throw new Error('RPC_URL environment variable is not set');
  }

  if (!accountPrivateKey) {
    throw new Error('ACCOUNT_PRIVATE_KEY environment variable is not set');
  }

  const contractAddress = getConfidentialErc20Address();

  const account = privateKeyToAccount(accountPrivateKey);
  const client = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  const txHash = await client.writeContract({
    address: contractAddress,
    abi: confidentialErc20Abi,
    functionName: 'register_agent_pk',
    args: [publicKeyHexToBytes(params.publicKey), params.agentId],
  });

  return txHash;
}
