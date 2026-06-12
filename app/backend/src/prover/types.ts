export type ProverJobRequest = {
  paymentId: string;
  sealedKey: string;
  senderOnchainId: string; // decimal string
  senderPublicKey: string; // 64-byte hex (x || y)
  receiverOnchainId: string;
  receiverPublicKey: string;
  token: string; // ERC-20 address
  proofAmount: string; // decimal string, 12-decimal proof units (max 40 bits)
};

export type ProverJobResult =
  | { ok: true; paymentId: string; proofInputs: number[]; proof: number[] }
  | { ok: false; paymentId: string; error: string };
