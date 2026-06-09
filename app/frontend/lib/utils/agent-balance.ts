import * as curveWasm from "../../../../old-app/frontend/node_modules/confidential-transfers/baby-giant";

type CipherPoint = {
  x: bigint;
  y: bigint;
};

type Ciphertext = {
  c1: CipherPoint;
  c2: CipherPoint;
};

function bytesToBigInt(bytes: number[]) {
  return BigInt(
    `0x${bytes
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`,
  );
}

export function parseEncryptedBalance(bytes: number[]): Ciphertext {
  if (bytes.length !== 128) {
    throw new Error(`Expected 128 encrypted balance bytes, received ${bytes.length}.`);
  }

  return {
    c1: {
      x: bytesToBigInt(bytes.slice(0, 32)),
      y: bytesToBigInt(bytes.slice(32, 64)),
    },
    c2: {
      x: bytesToBigInt(bytes.slice(64, 96)),
      y: bytesToBigInt(bytes.slice(96, 128)),
    },
  };
}

export function decryptAgentBalance(encryptedBalance: number[], privateKey: string) {
  const parsed = parseEncryptedBalance(encryptedBalance);

  if (parsed.c2.x === BigInt(0)) {
    return BigInt(0);
  }

  const encodedPoint = curveWasm.elgamal_decrypt(
    BigInt(privateKey).toString(),
    parsed.c1.x.toString(),
    parsed.c1.y.toString(),
    parsed.c2.x.toString(),
    parsed.c2.y.toString(),
  );

  const [x, y] = encodedPoint.split("|");
  return BigInt(curveWasm.grumpkin_bsgs_str(x, y).toString());
}

export function formatTokenAmount(amountInMicroTokens: bigint, decimals = 6) {
  const negative = amountInMicroTokens < BigInt(0);
  const absoluteValue = negative ? amountInMicroTokens * BigInt(-1) : amountInMicroTokens;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = absoluteValue / base;
  const fraction = absoluteValue % base;
  const trimmedFraction = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");

  const formatted = trimmedFraction ? `${whole.toString()}.${trimmedFraction}` : whole.toString();
  return negative ? `-${formatted}` : formatted;
}
