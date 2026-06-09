import { getConfidentialErc20Address } from './contracts';

const { encodeFunctionData, parseAbi } = require('viem');

const confidentialErc20Abi = parseAbi([
  'function registerAgentPk(uint8[64] public_key, uint32 agent_id)',
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

export function buildRegisterAgentTransaction(params: {
  publicKey: string;
  agentId: bigint;
}) {
  const contractAddress = getConfidentialErc20Address();
  const data = encodeFunctionData({
    abi: confidentialErc20Abi,
    functionName: 'registerAgentPk',
    args: [publicKeyHexToBytes(params.publicKey), params.agentId],
  });

  return {
    to: contractAddress,
    data,
  };
}
