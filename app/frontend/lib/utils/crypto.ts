import { GrumpkinScalar, Schnorr } from "@aztec/aztec.js";

export type AgentKeyPair = {
  privateKey: string;
  publicKey: {
    x: string;
    y: string;
  };
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function frTo32BytesHex(fr: { toBuffer(): Uint8Array }) {
  const buffer = fr.toBuffer();

  if (buffer.length !== 32) {
    throw new Error(`Expected 32 bytes, got ${buffer.length}`);
  }

  return `0x${bytesToHex(buffer)}`;
}

export async function generateAgentKeyPair(seed?: string): Promise<AgentKeyPair> {
  const privateScalar = seed
    ? GrumpkinScalar.fromString(seed)
    : GrumpkinScalar.random();

  const schnorr = new Schnorr();
  const rawPublicKey = await schnorr.computePublicKey(privateScalar);

  return {
    privateKey: `0x${bytesToHex(privateScalar.toBuffer())}`,
    publicKey: {
      x: frTo32BytesHex(rawPublicKey.x),
      y: frTo32BytesHex(rawPublicKey.y),
    },
  };
}

export function serializePublicKey(publicKey: AgentKeyPair["publicKey"]) {
  return `0x${publicKey.x.replace(/^0x/, "")}${publicKey.y.replace(/^0x/, "")}`;
}
