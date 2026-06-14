/**
 * One-shot demo fixture: creates two SDK demo agents (buyer + seller) with
 * locally generated Grumpkin keys, registers them on-chain (the backend owner
 * wallet becomes their controller), gives the seller a priced service, wraps a
 * little ETH into demo WETH, deposits confidential funds for the buyer, and
 * mints SDK API keys for both.
 *
 * Usage (from app/backend):
 *   npx tsx src/scripts/setupSdkDemo.ts
 */
import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

import dotenv from 'dotenv';

dotenv.config();

import { convertDisplayAmountToProofAmount, convertProofAmountToErc20Amount } from '../lib/amounts';
import { loadEncryptedBalanceFromChain } from '../lib/confidentialTransfer';
import { getConfidentialErc20Address, getWethTokenAddress } from '../lib/contracts';
import { prisma } from '../lib/prisma';
import { createAgentApiKey } from '../lib/sdkKeys';

const { createPublicClient, createWalletClient, http, parseAbi, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arbitrumSepolia } = require('viem/chains');

const { Noir } = require('@noir-lang/noir_js');
const { UltraHonkBackend } = require('@aztec/bb.js');

const DEPOSIT_DISPLAY_AMOUNT = '0.002'; // WETH deposited for the buyer
const SERVICE_PRICE = '0.001'; // WETH per response
// Hosted seller endpoint so the demo needs nothing running on localhost.
const SELLER_ENDPOINT =
  process.env.DEMO_RESEARCH_ENDPOINT ||
  'https://velum-network-production.up.railway.app/demo/research';

async function loadBabyGiant() {
  const bindings = require('confidential-transfers/baby-giant/baby_giant_wasm_bg.js');
  const wasmPath = require.resolve('confidential-transfers/baby-giant/baby_giant_wasm_bg.wasm');
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), {
    './baby_giant_wasm_bg.js': bindings,
  });
  bindings.__wbg_set_wasm(instance.exports);
  (instance.exports as { __wbindgen_start?: () => void }).__wbindgen_start?.();
  return bindings;
}

function generateKeypair(wasm: any) {
  const privateKey = BigInt(`0x${crypto.randomBytes(16).toString('hex')}`).toString();
  const [x, y] = wasm.grumpkin_point(privateKey).split('|');
  const publicKey =
    BigInt(x).toString(16).padStart(64, '0') + BigInt(y).toString(16).padStart(64, '0');
  return { privateKey, publicKey, pubX: BigInt(x).toString(), pubY: BigInt(y).toString() };
}

function fieldToBytes32(value: string) {
  const normalized = value.startsWith('0x') ? value : BigInt(value).toString(16);
  const hex = normalized.replace(/^0x/, '').padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

// Ported from app/frontend/lib/utils/agent-private-features.ts
function convertDepositPublicInputs(publicInputs: string[]) {
  if (publicInputs.length < 13) {
    throw new Error(`Expected at least 13 deposit public inputs, received ${publicInputs.length}.`);
  }
  const packed = new Uint8Array(416);
  let offset = 0;
  for (const index of [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12]) {
    packed.set(fieldToBytes32(publicInputs[index]), offset);
    offset += 32;
    if (index === 5) {
      packed.set(fieldToBytes32(publicInputs[6]), offset);
      offset += 32;
      packed.set(fieldToBytes32(publicInputs[7]), offset);
      offset += 32;
    }
  }
  return packed;
}

function parseBalancePoints(encrypted: number[]) {
  const toPoint = (offset: number) => ({
    x: BigInt(
      `0x${encrypted.slice(offset, offset + 32).map((v) => v.toString(16).padStart(2, '0')).join('')}`,
    ).toString(),
    y: BigInt(
      `0x${encrypted.slice(offset + 32, offset + 64).map((v) => v.toString(16).padStart(2, '0')).join('')}`,
    ).toString(),
  });
  return { x1: toPoint(0), x2: toPoint(64) };
}

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const ownerKey = process.env.ACCOUNT_PRIVATE_KEY as `0x${string}`;
  if (!rpcUrl || !ownerKey) {
    throw new Error('RPC_URL and ACCOUNT_PRIVATE_KEY are required');
  }

  const wasm = await loadBabyGiant();
  const account = privateKeyToAccount(ownerKey);
  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpcUrl) });

  const confidential = getConfidentialErc20Address() as `0x${string}`;
  const weth = getWethTokenAddress() as `0x${string}`;

  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!user) {
    throw new Error('No user in the DB — create one through the app first');
  }

  console.log(`Owner wallet: ${account.address}`);
  console.log(`Demo agents will belong to user ${user.email}`);

  const buyer = generateKeypair(wasm);
  const seller = generateKeypair(wasm);

  // Reserve on-chain agent ids from the same sequence the app uses.
  const reserveId = async () => {
    const [row] = await prisma.$queryRaw<Array<{ nextval: bigint }>>`
      SELECT nextval(pg_get_serial_sequence('agents', 'agent_id'))::bigint AS nextval
    `;
    return row.nextval;
  };

  const buyerId = await reserveId();
  const sellerId = await reserveId();
  console.log(`Reserved on-chain ids: buyer #${buyerId}, seller #${sellerId}`);

  // 1. Register both agents on-chain (owner becomes their controller).
  const registerAbi = parseAbi(['function registerAgentPk(uint8[64] public_key, uint32 agent_id)']);
  for (const [label, kp, id] of [
    ['buyer', buyer, buyerId],
    ['seller', seller, sellerId],
  ] as const) {
    const pkBytes = kp.publicKey.match(/.{2}/g)!.map((b: string) => Number.parseInt(b, 16));
    const hash = await walletClient.writeContract({
      address: confidential,
      abi: registerAbi,
      functionName: 'registerAgentPk',
      args: [pkBytes, Number(id)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`registerAgentPk reverted for ${label}`);
    console.log(`Registered ${label} agent #${id} on-chain: ${hash}`);
  }

  // 2. DB rows.
  const buyerAgent = await prisma.agent.create({
    data: {
      agentId: buyerId,
      userId: user.id,
      title: 'SDK Demo Buyer',
      description: 'Demo agent that buys research through @velum/sdk',
      category: 'Research',
      publicKey: buyer.publicKey,
    },
  });

  const sellerAgent = await prisma.agent.create({
    data: {
      agentId: sellerId,
      userId: user.id,
      title: 'SDK Demo Research Service',
      description: 'Sells confidential research reports through @velum/sdk',
      category: 'Research',
      publicKey: seller.publicKey,
    },
  });

  const service = await prisma.service.create({
    data: {
      agentId: sellerAgent.id,
      price: SERVICE_PRICE,
      pricingModel: 'per_request',
      currency: 'WETH',
      billingUnit: 'response',
      endpointUrl: SELLER_ENDPOINT,
      status: 'online',
    },
  });
  await prisma.agentReputation.create({
    data: { serviceId: service.id, successResponses: 0, totalRequests: 0 },
  });
  console.log(`DB rows created (service ${service.id})`);

  // 3. Fund the buyer: wrap ETH -> WETH, approve, prove + deposit.
  const proofAmount = convertDisplayAmountToProofAmount(DEPOSIT_DISPLAY_AMOUNT);
  const erc20Amount = convertProofAmountToErc20Amount(proofAmount);

  const wrapHash = await walletClient.sendTransaction({
    to: weth,
    value: parseEther(DEPOSIT_DISPLAY_AMOUNT),
  });
  await publicClient.waitForTransactionReceipt({ hash: wrapHash });
  console.log(`Wrapped ${DEPOSIT_DISPLAY_AMOUNT} ETH into WETH: ${wrapHash}`);

  const erc20Abi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);
  const approveHash = await walletClient.writeContract({
    address: weth,
    abi: erc20Abi,
    functionName: 'approve',
    args: [confidential, erc20Amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`Approved ConfidentialERC20 for ${erc20Amount} wei: ${approveHash}`);

  const currentBalance = await loadEncryptedBalanceFromChain(buyerId);
  const balancePoints = parseBalancePoints(currentBalance.encrypted);

  console.log('Generating deposit proof (~30-60s)...');
  const circuitPath =
    process.env.DEPOSIT_CIRCUIT_PATH ||
    path.resolve(__dirname, '../../circuits/deposit.json');
  const circuit = JSON.parse(readFileSync(circuitPath, 'utf8'));
  const noir = new Noir(circuit);
  const { witness } = await noir.execute({
    agent_priv_key: buyer.privateKey,
    r_amount: BigInt(`0x${crypto.randomBytes(16).toString('hex')}`).toString(),
    agent_id: buyerId.toString(),
    agent_pubkey: { x: buyer.pubX, y: buyer.pubY },
    current_balance_x1: balancePoints.x1,
    current_balance_x2: balancePoints.x2,
    token: BigInt(weth).toString(),
    amount: proofAmount.toString(),
  });
  const backend = new UltraHonkBackend(circuit.bytecode);
  const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });
  const proofInputs = convertDepositPublicInputs(publicInputs);
  console.log(`Deposit proof: ${proof.length} bytes, ${publicInputs.length} public inputs`);

  const depositAbi = parseAbi(['function deposit(uint8[] proof_inputs, bytes proof)']);
  const proofHex = `0x${Array.from(proof as Uint8Array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
  const depositHash = await walletClient.writeContract({
    address: confidential,
    abi: depositAbi,
    functionName: 'deposit',
    args: [Array.from(proofInputs), proofHex],
    gas: BigInt(8_000_000),
  });
  const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
  if (depositReceipt.status !== 'success') throw new Error('Deposit reverted');
  console.log(`Deposited ${DEPOSIT_DISPLAY_AMOUNT} WETH confidentially: ${depositHash}`);

  // Sanity: decrypt the new balance with the buyer's key.
  const newBalance = await loadEncryptedBalanceFromChain(buyerId);
  const parsed = parseBalancePoints(newBalance.encrypted);
  const decrypted = wasm.elgamal_decrypt(
    buyer.privateKey,
    parsed.x1.x,
    parsed.x1.y,
    parsed.x2.x,
    parsed.x2.y,
  );
  const [dx, dy] = decrypted.split('|');
  console.log(`Buyer decrypted balance (proof units): ${wasm.grumpkin_bsgs_str(dx, dy)}`);

  // 4. SDK API keys.
  const buyerKey = createAgentApiKey({
    agentId: buyerAgent.id,
    onchainAgentId: buyerId.toString(),
    privateKey: buyer.privateKey,
  });
  const sellerKey = createAgentApiKey({
    agentId: sellerAgent.id,
    onchainAgentId: sellerId.toString(),
    privateKey: seller.privateKey,
  });

  console.log('\n=== SDK demo ready ===');
  console.log(`Buyer agent:  #${buyerId} (db ${buyerAgent.id})`);
  console.log(`Seller agent: #${sellerId} (db ${sellerAgent.id}, service ${service.id})`);
  console.log(`\nVELUM_BUYER_API_KEY=${buyerKey.apiKey}`);
  console.log(`\nVELUM_SELLER_API_KEY=${sellerKey.apiKey}`);
  console.log(`\nKeys expire ${buyerKey.expiresAt.toISOString()}`);
  console.log('\nRun the demo from velum-network/sdk:');
  console.log('  VELUM_BUYER_API_KEY=... VELUM_SELLER_API_KEY=... npm run example');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
