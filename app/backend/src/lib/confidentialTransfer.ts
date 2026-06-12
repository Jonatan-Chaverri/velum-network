/**
 * Shared on-chain plumbing for confidential transfers: reading encrypted
 * balances and submitting owner-signed `transferConfidential` transactions.
 * Used by both the manual transfer route (`POST /api/agents/transfer`) and the
 * SDK payment pipeline.
 */
import { getConfidentialErc20Address, getWethTokenAddress } from './contracts';

// viem must be loaded with require(): importing it pulls ox's raw TS sources,
// which break tsc 5.9 (see routes/agents.ts).
const { decodeFunctionResult, encodeFunctionData, parseAbi } = require('viem');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

const confidentialErc20ReadAbi = parseAbi([
  'function balanceOfEnc(address token, uint32 agent_id) view returns (uint8[128])',
]);
const confidentialErc20WriteAbi = parseAbi([
  // Stylus exports snake_case Rust methods as camelCase in the ABI - the
  // on-chain selector is keccak("transferConfidential(uint8[],bytes)").
  'function transferConfidential(uint8[] proof_inputs, bytes proof)',
]);

const DEFAULT_FALLBACK_GAS_LIMIT = BigInt(8_000_000);
const DEFAULT_MAX_PRIORITY_FEE_PER_GAS_WEI = BigInt(20_000_000);
const DEFAULT_MIN_MAX_FEE_PER_GAS_WEI = BigInt(100_000_000);

export function bytesToHex(bytes: number[]) {
  return `0x${bytes.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export async function loadEncryptedBalanceFromChain(agentId: bigint) {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new Error('RPC_URL environment variable is not set');
  }

  const confidentialErc20Address = getConfidentialErc20Address() as `0x${string}`;
  const wethTokenAddress = getWethTokenAddress() as `0x${string}`;

  const data = encodeFunctionData({
    abi: confidentialErc20ReadAbi,
    functionName: 'balanceOfEnc',
    args: [wethTokenAddress, Number(agentId)],
  });

  const rpcResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: confidentialErc20Address,
          data,
        },
        'latest',
      ],
    }),
  });

  const rpcPayload = await rpcResponse.json() as {
    result?: `0x${string}`;
    error?: { message?: string };
  };

  if (!rpcResponse.ok || rpcPayload.error || !rpcPayload.result) {
    throw new Error(rpcPayload.error?.message || 'Failed to read encrypted balance on-chain');
  }

  const balance = decodeFunctionResult({
    abi: confidentialErc20ReadAbi,
    functionName: 'balanceOfEnc',
    data: rpcPayload.result,
  });

  return {
    token: wethTokenAddress,
    network: process.env.NETWORK ?? 'SEPOLIA',
    encrypted: Array.from(balance as readonly bigint[], (value) => Number(value)),
  };
}

async function getServerTransactionFeeConfig(
  publicClient: any,
  request: { account: `0x${string}`; to: `0x${string}`; data: `0x${string}` },
) {
  let gasLimit = DEFAULT_FALLBACK_GAS_LIMIT;

  try {
    const estimatedGas = await publicClient.estimateGas(request);
    gasLimit = (estimatedGas * BigInt(12)) / BigInt(10);
  } catch (estimateError) {
    console.error(
      '[confidentialTransfer] eth_estimateGas failed, using fallback gas limit:',
      estimateError,
    );
  }

  let maxPriorityFeePerGas = DEFAULT_MAX_PRIORITY_FEE_PER_GAS_WEI;

  try {
    const suggestedPriorityFee = await publicClient.request({
      method: 'eth_maxPriorityFeePerGas',
    }) as `0x${string}`;

    maxPriorityFeePerGas = BigInt(suggestedPriorityFee);
  } catch (priorityFeeError) {
    console.warn(
      '[confidentialTransfer] priority fee fetch failed, using fallback priority fee:',
      priorityFeeError,
    );
  }

  let baseFeePerGas = BigInt(0);

  try {
    const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
    if (latestBlock.baseFeePerGas) {
      baseFeePerGas = latestBlock.baseFeePerGas;
    }
  } catch (baseFeeError) {
    console.warn(
      '[confidentialTransfer] base fee fetch failed, using fallback fee floor:',
      baseFeeError,
    );
  }

  const maxFeePerGas = baseFeePerGas > BigInt(0)
    ? (baseFeePerGas * BigInt(2)) + maxPriorityFeePerGas
    : DEFAULT_MIN_MAX_FEE_PER_GAS_WEI;

  return {
    gas: gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    baseFeePerGas,
  };
}

/**
 * Submits an owner-signed transferConfidential transaction and waits for the
 * receipt. `proofInputs` must be the 736-byte packed public inputs (23 words),
 * `proof` the raw UltraHonk proof bytes.
 */
export async function submitConfidentialTransfer(params: {
  proofInputs: number[];
  proof: number[];
  logContext?: Record<string, string>;
}): Promise<`0x${string}`> {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.ACCOUNT_PRIVATE_KEY as `0x${string}` | undefined;

  if (!rpcUrl || !privateKey) {
    throw new Error('RPC_URL and ACCOUNT_PRIVATE_KEY must be configured for confidential transfers');
  }

  if (params.proofInputs.length !== 736) {
    throw new Error(`proofInputs must be exactly 736 bytes, received ${params.proofInputs.length}`);
  }

  const account = privateKeyToAccount(privateKey);
  const confidentialErc20Address = getConfidentialErc20Address() as `0x${string}`;
  const proofHex = bytesToHex(params.proof) as `0x${string}`;

  const data = encodeFunctionData({
    abi: confidentialErc20WriteAbi,
    functionName: 'transferConfidential',
    args: [params.proofInputs, proofHex],
  });

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  const feeConfig = await getServerTransactionFeeConfig(publicClient, {
    account: account.address,
    to: confidentialErc20Address,
    data,
  });

  console.log('[confidentialTransfer] submitting owner transaction', {
    ...params.logContext,
    gas: feeConfig.gas.toString(),
    baseFeePerGas: feeConfig.baseFeePerGas.toString(),
    maxFeePerGas: feeConfig.maxFeePerGas.toString(),
    maxPriorityFeePerGas: feeConfig.maxPriorityFeePerGas.toString(),
  });

  const txHash = await walletClient.sendTransaction({
    account,
    to: confidentialErc20Address,
    data,
    gas: feeConfig.gas,
    maxFeePerGas: feeConfig.maxFeePerGas,
    maxPriorityFeePerGas: feeConfig.maxPriorityFeePerGas,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success') {
    throw new Error('Transfer transaction reverted on-chain');
  }

  return txHash;
}
