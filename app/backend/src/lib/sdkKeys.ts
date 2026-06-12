/**
 * SDK API keys are capability tokens: `vk_agent_<base64url(payload)>.<HMAC-SHA256>`.
 *
 * The payload carries the agent's ElGamal private key sealed with AES-256-GCM
 * under PROVER_SEALING_KEY. The main backend only validates the HMAC signature
 * (API_KEY_SIGNING_SECRET) and never unseals the key — `unsealPrivateKey` is
 * called exclusively inside the prover worker process, and the plaintext key
 * lives only in that process's memory for the duration of one proof.
 *
 * The DB never stores the private key, sealed or not. Revocation by jti and
 * spend limits are roadmap; the 5-day `exp` bounds exposure for the demo.
 */
import crypto from 'crypto';

export const API_KEY_PREFIX = 'vk_agent_';
const API_KEY_TTL_SECONDS = 5 * 24 * 60 * 60; // 5 days

export type SdkKeyPayload = {
  agentId: string; // agent DB uuid
  onchainAgentId: string; // decimal string, the uint32 used on-chain
  exp: number; // unix seconds
  jti: string;
  sealedKey: string; // base64url(iv || authTag || ciphertext)
};

function base64UrlEncode(data: Buffer | string) {
  return Buffer.from(data).toString('base64url');
}

function requireSecret(name: 'API_KEY_SIGNING_SECRET' | 'PROVER_SEALING_KEY') {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} environment variable is not set`);
  }
  return secret;
}

// Derive a 32-byte AES key from the configured secret so operators can use any
// sufficiently random string instead of exactly 32 bytes of hex.
function deriveSealingKey() {
  return crypto.createHash('sha256').update(requireSecret('PROVER_SEALING_KEY')).digest();
}

function signPayload(payloadB64: string) {
  return crypto
    .createHmac('sha256', requireSecret('API_KEY_SIGNING_SECRET'))
    .update(payloadB64)
    .digest('base64url');
}

export function sealPrivateKey(privateKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveSealingKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  return base64UrlEncode(Buffer.concat([iv, cipher.getAuthTag(), ciphertext]));
}

// Only the prover worker may call this. See module docs.
export function unsealPrivateKey(sealedKey: string): string {
  const data = Buffer.from(sealedKey, 'base64url');
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveSealingKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function createAgentApiKey(params: {
  agentId: string;
  onchainAgentId: string;
  privateKey: string;
}): { apiKey: string; expiresAt: Date } {
  const exp = Math.floor(Date.now() / 1000) + API_KEY_TTL_SECONDS;

  const payload: SdkKeyPayload = {
    agentId: params.agentId,
    onchainAgentId: params.onchainAgentId,
    exp,
    jti: crypto.randomUUID(),
    sealedKey: sealPrivateKey(params.privateKey),
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadB64);

  return {
    apiKey: `${API_KEY_PREFIX}${payloadB64}.${signature}`,
    expiresAt: new Date(exp * 1000),
  };
}

export class SdkKeyError extends Error {}

export function verifyAgentApiKey(apiKey: string): SdkKeyPayload {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    throw new SdkKeyError('Invalid API key format');
  }

  const [payloadB64, signature, ...rest] = apiKey.slice(API_KEY_PREFIX.length).split('.');

  if (!payloadB64 || !signature || rest.length > 0) {
    throw new SdkKeyError('Invalid API key format');
  }

  const expected = signPayload(payloadB64);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new SdkKeyError('Invalid API key signature');
  }

  let payload: SdkKeyPayload;

  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new SdkKeyError('Invalid API key payload');
  }

  if (!payload.agentId || !payload.onchainAgentId || !payload.sealedKey || !payload.exp) {
    throw new SdkKeyError('Invalid API key payload');
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new SdkKeyError('API key has expired');
  }

  return payload;
}
