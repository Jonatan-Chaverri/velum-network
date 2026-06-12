/**
 * Prover worker — runs as a forked child process (one process per payment) so
 * the 30-60s of bb.js proving never blocks the API event loop.
 *
 * This is the only place where a sealed agent private key is decrypted. The
 * plaintext key exists in this process's memory for the duration of one proof
 * and the process exits right after responding.
 *
 * Proof generation is ported from the frontend
 * (`app/frontend/lib/utils/agent-private-features.ts`) and the balance
 * decryption (ElGamal + baby-step/giant-step) from
 * (`app/frontend/lib/utils/agent-balance.ts`).
 */
import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

import { loadEncryptedBalanceFromChain } from '../lib/confidentialTransfer';
import { unsealPrivateKey } from '../lib/sdkKeys';
import { ProverJobRequest, ProverJobResult } from './types';

// noir_js / bb.js ship CJS builds; required lazily to keep startup fast and to
// stay clear of tsc issues with their bundled type sources (same reasoning as
// the viem require() pattern in routes/agents.ts).
const { Noir } = require('@noir-lang/noir_js');
const { UltraHonkBackend } = require('@aztec/bb.js');

type ProofPoint = { x: string; y: string };

function resolveTransferCircuitPath() {
  // src/prover and dist/prover are both two directories below app/backend, so
  // the same relative hop reaches velum-network/wallet_proof in dev and prod.
  return (
    process.env.TRANSFER_CIRCUIT_PATH ||
    path.resolve(__dirname, '../../../../wallet_proof/target/transfer.json')
  );
}

// The baby-giant wasm package is built with wasm-bindgen's bundler target, so
// Node cannot import it directly — instantiate the wasm by hand and hand the
// exports to the JS bindings.
async function loadBabyGiant() {
  const bindings = require('confidential-transfers/baby-giant/baby_giant_wasm_bg.js');
  const wasmPath = require.resolve('confidential-transfers/baby-giant/baby_giant_wasm_bg.wasm');
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), {
    './baby_giant_wasm_bg.js': bindings,
  });
  bindings.__wbg_set_wasm(instance.exports);
  (instance.exports as { __wbindgen_start?: () => void }).__wbindgen_start?.();
  return bindings as {
    elgamal_decrypt: (privKey: string, rx: string, ry: string, x: string, y: string) => string;
    grumpkin_bsgs_str: (x: string, y: string) => bigint;
  };
}

function bytesToBigInt(bytes: number[]) {
  return BigInt(`0x${bytes.map((value) => value.toString(16).padStart(2, '0')).join('')}`);
}

function decryptBalance(
  wasm: Awaited<ReturnType<typeof loadBabyGiant>>,
  encryptedBalance: number[],
  privateKey: string,
) {
  if (encryptedBalance.length !== 128) {
    throw new Error(`Expected 128 encrypted balance bytes, received ${encryptedBalance.length}.`);
  }

  const c1 = {
    x: bytesToBigInt(encryptedBalance.slice(0, 32)),
    y: bytesToBigInt(encryptedBalance.slice(32, 64)),
  };
  const c2 = {
    x: bytesToBigInt(encryptedBalance.slice(64, 96)),
    y: bytesToBigInt(encryptedBalance.slice(96, 128)),
  };

  if (c2.x === BigInt(0)) {
    return BigInt(0);
  }

  const encodedPoint = wasm.elgamal_decrypt(
    BigInt(privateKey).toString(),
    c1.x.toString(),
    c1.y.toString(),
    c2.x.toString(),
    c2.y.toString(),
  );

  const [x, y] = encodedPoint.split('|');
  return BigInt(wasm.grumpkin_bsgs_str(x, y).toString());
}

function splitAgentPublicKey(serializedPublicKey: string): ProofPoint {
  const normalized = serializedPublicKey.trim().replace(/^0x/, '');

  if (normalized.length !== 128) {
    throw new Error('Agent public key must be exactly 64 bytes.');
  }

  return {
    x: BigInt(`0x${normalized.slice(0, 64)}`).toString(),
    y: BigInt(`0x${normalized.slice(64, 128)}`).toString(),
  };
}

function parseEncryptedBalanceForProof(encryptedBalance: number[]) {
  if (encryptedBalance.length !== 128) {
    throw new Error(`Expected 128 encrypted balance bytes, received ${encryptedBalance.length}.`);
  }

  const toPoint = (offset: number): ProofPoint => ({
    x: bytesToBigInt(encryptedBalance.slice(offset, offset + 32)).toString(),
    y: bytesToBigInt(encryptedBalance.slice(offset + 32, offset + 64)).toString(),
  });

  return {
    currentBalanceX1: toPoint(0),
    currentBalanceX2: toPoint(64),
  };
}

function generateProofRandomness() {
  return BigInt(`0x${crypto.randomBytes(16).toString('hex')}`).toString();
}

function fieldToBytes32(value: string) {
  const normalized = value.startsWith('0x') ? value : BigInt(value).toString(16);
  const hex = normalized.replace(/^0x/, '').padStart(64, '0');

  if (hex.length > 64) {
    throw new Error('Field value exceeds 32 bytes.');
  }

  const bytes = new Uint8Array(32);

  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

// The transfer circuit exposes 23 public inputs; the Stylus contract expects
// them packed sequentially as 23 32-byte words (736 bytes).
function packTransferPublicInputs(publicInputs: string[]) {
  if (publicInputs.length < 23) {
    throw new Error(`Expected at least 23 transfer public inputs, received ${publicInputs.length}.`);
  }

  const packed = new Uint8Array(23 * 32);

  for (let index = 0; index < 23; index += 1) {
    packed.set(fieldToBytes32(publicInputs[index]), index * 32);
  }

  return packed;
}

async function runJob(job: ProverJobRequest): Promise<ProverJobResult> {
  const wasm = await loadBabyGiant();

  // (a) Unseal the sender's private key — in memory only, never logged.
  const senderPrivateKey = unsealPrivateKey(job.sealedKey);

  // (b) Read both encrypted balances at proving time. The proof binds to the
  // current ciphertexts; the per-sender queue upstream keeps them fresh.
  const [senderBalance, receiverBalance] = await Promise.all([
    loadEncryptedBalanceFromChain(BigInt(job.senderOnchainId)),
    loadEncryptedBalanceFromChain(BigInt(job.receiverOnchainId)),
  ]);

  const amount = BigInt(job.proofAmount);
  const senderCurrentBalance = decryptBalance(wasm, senderBalance.encrypted, senderPrivateKey);

  // (c) Solvency pre-check. The circuit enforces this too, but failing here
  // gives the caller a readable error instead of a witness-generation failure.
  if (amount > senderCurrentBalance) {
    return {
      ok: false,
      paymentId: job.paymentId,
      error: 'Insufficient balance: the transfer amount exceeds the sender agent\'s confidential balance',
    };
  }

  const senderParsed = parseEncryptedBalanceForProof(senderBalance.encrypted);
  const receiverParsed = parseEncryptedBalanceForProof(receiverBalance.encrypted);

  const inputs = {
    sender_priv_key: BigInt(senderPrivateKey).toString(),
    transfer_amount: amount.toString(),
    sender_current_balance: senderCurrentBalance.toString(),
    r_amount_sender: generateProofRandomness(),
    r_amount_receiver: generateProofRandomness(),
    sender_agent_id: BigInt(job.senderOnchainId).toString(),
    receiver_agent_id: BigInt(job.receiverOnchainId).toString(),
    receiver_pubkey: splitAgentPublicKey(job.receiverPublicKey),
    receiver_old_balance_x1: receiverParsed.currentBalanceX1,
    receiver_old_balance_x2: receiverParsed.currentBalanceX2,
    sender_pubkey: splitAgentPublicKey(job.senderPublicKey),
    sender_old_balance_x1: senderParsed.currentBalanceX1,
    sender_old_balance_x2: senderParsed.currentBalanceX2,
    token: BigInt(job.token).toString(),
  };

  console.log('[prover] generating transfer proof', {
    paymentId: job.paymentId,
    senderAgentId: job.senderOnchainId,
    receiverAgentId: job.receiverOnchainId,
  });

  // (d) Witness + UltraHonk proof (keccak flavor, same as the on-chain verifier).
  const circuit = JSON.parse(readFileSync(resolveTransferCircuitPath(), 'utf8'));
  const noir = new Noir(circuit);
  const { witness } = await noir.execute(inputs);
  const backend = new UltraHonkBackend(circuit.bytecode);
  const { proof, publicInputs } = await backend.generateProof(witness, { keccak: true });

  const proofInputs = packTransferPublicInputs(publicInputs);

  console.log('[prover] proof generated', {
    paymentId: job.paymentId,
    proofBytes: proof.length,
    publicInputs: publicInputs.length,
  });

  return {
    ok: true,
    paymentId: job.paymentId,
    proofInputs: Array.from(proofInputs),
    proof: Array.from(proof as Uint8Array),
  };
}

process.on('message', (job: ProverJobRequest) => {
  runJob(job)
    .catch((error): ProverJobResult => ({
      ok: false,
      paymentId: job.paymentId,
      error: error instanceof Error ? error.message : String(error),
    }))
    .then((result) => {
      // Exit only once the IPC write has flushed — the payload is large
      // (proof + packed inputs) and exiting earlier truncates it.
      if (!process.send) {
        process.exit(1);
      }
      process.send(result, undefined, undefined, (error: Error | null) => {
        process.exit(error ? 1 : 0);
      });
    });
});
