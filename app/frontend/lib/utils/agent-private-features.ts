"use client";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir, type InputMap } from "@noir-lang/noir_js";
import depositCircuit from "../../../../wallet_proof/target/deposit.json";

export const AGENT_TOKEN_DECIMALS = 12;
export const ERC20_TRANSFER_SCALE = BigInt(1_000_000);
const MAX_PROOF_AMOUNT = (BigInt(1) << BigInt(40)) - BigInt(1);
const APPROVE_SELECTOR = "095ea7b3";
const DEPOSIT_SELECTOR = "62023c7b";

const depositBackend = new UltraHonkBackend(depositCircuit.bytecode as unknown as string);

type ProofPoint = {
  x: string;
  y: string;
};

type DepositProofParams = {
  agentId: string;
  agentPrivateKey: string;
  agentPublicKey: string;
  currentEncryptedBalance: number[];
  token: string;
  amount: bigint;
};

function fieldToBytes32(value: string) {
  const normalized = value.startsWith("0x") ? value : BigInt(value).toString(16);
  const hex = normalized.replace(/^0x/, "").padStart(64, "0");

  if (hex.length > 64) {
    throw new Error("Field value exceeds 32 bytes.");
  }

  const bytes = new Uint8Array(32);

  for (let index = 0; index < 32; index += 1) {
    const start = index * 2;
    bytes[index] = Number.parseInt(hex.slice(start, start + 2), 16);
  }

  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function padHexToWord(hex: string) {
  return hex.replace(/^0x/, "").padStart(64, "0");
}

function encodeUint256(value: bigint) {
  return padHexToWord(value.toString(16));
}

function encodeAddress(address: string) {
  const normalized = address.trim().replace(/^0x/, "").toLowerCase();

  if (normalized.length !== 40) {
    throw new Error("Expected a 20-byte address.");
  }

  return normalized.padStart(64, "0");
}

function encodeDynamicBytes(data: Uint8Array) {
  const lengthWord = encodeUint256(BigInt(data.length));
  const hex = bytesToHex(data);
  const paddedLength = Math.ceil(data.length / 32) * 64;
  const dataWord = hex.padEnd(paddedLength, "0");

  return `${lengthWord}${dataWord}`;
}

// The Stylus contract declares `proof_inputs` as `Vec<u8>`, which exports as
// `uint8[]` in the ABI — every element occupies a full 32-byte word.
function encodeUint8Array(data: Uint8Array) {
  const lengthWord = encodeUint256(BigInt(data.length));
  const words = Array.from(data)
    .map((byte) => byte.toString(16).padStart(2, "0").padStart(64, "0"))
    .join("");

  return `${lengthWord}${words}`;
}

function toDecimalString(value: string) {
  return BigInt(value).toString();
}

function splitAgentPublicKey(serializedPublicKey: string): ProofPoint[] {
  const normalized = serializedPublicKey.trim().replace(/^0x/, "");

  if (normalized.length !== 128) {
    throw new Error("Agent public key must be exactly 64 bytes.");
  }

  return [
    {
      x: toDecimalString(`0x${normalized.slice(0, 64)}`),
      y: toDecimalString(`0x${normalized.slice(64, 128)}`),
    },
  ];
}

export function parseEncryptedBalanceForProof(encryptedBalance: number[]) {
  if (encryptedBalance.length !== 128) {
    throw new Error(`Expected 128 encrypted balance bytes, received ${encryptedBalance.length}.`);
  }

  const toPoint = (offset: number) => ({
    x: BigInt(
      `0x${encryptedBalance
        .slice(offset, offset + 32)
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")}`,
    ).toString(),
    y: BigInt(
      `0x${encryptedBalance
        .slice(offset + 32, offset + 64)
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")}`,
    ).toString(),
  });

  return {
    currentBalanceX1: toPoint(0),
    currentBalanceX2: toPoint(64),
  };
}

export function convertDisplayAmountToProofAmount(displayAmount: string) {
  const normalized = displayAmount.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Deposit amount is not a valid decimal value.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");

  if (fractionPart.length > AGENT_TOKEN_DECIMALS) {
    throw new Error("Deposit amount uses too many decimals.");
  }

  const whole = BigInt(wholePart || "0") * BigInt(10) ** BigInt(AGENT_TOKEN_DECIMALS);
  const fraction = BigInt(fractionPart.padEnd(AGENT_TOKEN_DECIMALS, "0") || "0");
  const amount = whole + fraction;

  if (amount <= BigInt(0)) {
    throw new Error("Deposit amount must be greater than zero.");
  }

  if (amount > MAX_PROOF_AMOUNT) {
    throw new Error("Deposit amount is too large for the proving circuit.");
  }

  return amount;
}

export function convertProofAmountToErc20Amount(proofAmount: bigint) {
  return proofAmount * ERC20_TRANSFER_SCALE;
}

export function buildApproveCalldata(spender: string, amount: bigint) {
  return `0x${APPROVE_SELECTOR}${encodeAddress(spender)}${encodeUint256(amount)}`;
}

export function buildDepositCalldata(proofInputs: Uint8Array, proof: Uint8Array) {
  const proofInputsEncoded = encodeUint8Array(proofInputs);
  const proofEncoded = encodeDynamicBytes(proof);
  const firstOffset = encodeUint256(BigInt(64));
  const secondOffset = encodeUint256(BigInt(64 + proofInputsEncoded.length / 2));

  return `0x${DEPOSIT_SELECTOR}${firstOffset}${secondOffset}${proofInputsEncoded}${proofEncoded}`;
}

export function generateProofRandomness() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  return BigInt(
    `0x${Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`,
  ).toString();
}

export async function generateAgentDepositProof(params: DepositProofParams) {
  const noir = new Noir(depositCircuit as never);
  const [agentPubkey] = splitAgentPublicKey(params.agentPublicKey);
  const { currentBalanceX1, currentBalanceX2 } = parseEncryptedBalanceForProof(
    params.currentEncryptedBalance,
  );

  const inputs: InputMap = {
    agent_priv_key: BigInt(params.agentPrivateKey).toString(),
    r_amount: generateProofRandomness(),
    agent_id: BigInt(params.agentId).toString(),
    agent_pubkey: agentPubkey,
    current_balance_x1: currentBalanceX1,
    current_balance_x2: currentBalanceX2,
    token: BigInt(params.token).toString(),
    amount: params.amount.toString(),
  };

  console.log("[agent-deposit] generating witness", {
    agentId: params.agentId,
    token: params.token,
    proofAmount: params.amount.toString(),
  });

  const { witness } = await noir.execute(inputs);

  console.log("[agent-deposit] generating ultra honk proof");
  const proof = await depositBackend.generateProof(witness, { keccak: true });

  return {
    proof: proof.proof,
    publicInputs: proof.publicInputs,
  };
}

export function convertAgentDepositPublicInputs(publicInputs: string[]) {
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
