/**
 * @velum/sdk — confidential agent-to-agent payments on Velum Network.
 *
 * Zero crypto dependencies by design: the heavy lifting (ElGamal decryption,
 * UltraHonk proving, on-chain settlement) is delegated to the Velum platform.
 * Your agent's private key travels sealed inside the API key and is only
 * decrypted transiently inside the platform's prover worker — never persisted.
 *
 * Roadmap (documented TODOs, not implemented):
 * - proving: "local" — generate transfer proofs on your own machine.
 * - API key revocation by jti and per-key spend limits.
 */

export type ProvingMode = 'delegated' | 'local';

export type VelumOptions = {
  /** Capability token from POST /api/agents/:id/sdk-key (vk_agent_...). */
  apiKey?: string;
  /** Velum API base URL. Defaults to VELUM_API_URL or http://localhost:3001. */
  baseUrl?: string;
  /** Only "delegated" is implemented; "local" is roadmap. */
  proving?: ProvingMode;
};

export type ServiceListing = {
  serviceId: string;
  agentId: string;
  onchainAgentId: string;
  title: string;
  description: string;
  category: string;
  price: string;
  pricingModel: string;
  currency: string;
  billingUnit: string;
  endpointUrl: string;
  reputation: { successResponses: number; totalRequests: number } | null;
};

export type Invoice = {
  invoiceId: string;
  serviceId: string;
  sellerAgentId: string;
  buyerAgentId: string;
  amount: string;
  currency: string;
  status: string;
  expiresAt: string;
  endpointUrl: string;
};

export type Receipt = {
  /** The signed receipt JWT — send it as the X-Velum-Receipt header. */
  token: string;
  invoiceId: string;
  payerAgentId: string;
  sellerAgentId: string;
  amount: string;
  txHash: string;
};

export type PaymentStatus = 'proving' | 'submitting' | 'settled' | 'failed';

export type Payment = {
  paymentId: string;
  invoiceId: string;
  status: PaymentStatus;
  txHash: string | null;
  receipt: string | null;
  error: string | null;
};

export type PayOptions = {
  /** Overall deadline for proving + settlement. Default 180 000 ms. */
  timeoutMs?: number;
  /** Polling interval. Default 3 000 ms. */
  pollIntervalMs?: number;
};

export type CallServiceOptions = {
  /** Override the service endpoint URL (e.g. for local testing). */
  url?: string;
};

/** Anything with a Node-style headers object — an Express request qualifies. */
export type IncomingRequestLike = {
  headers: Record<string, string | string[] | undefined>;
};

export const RECEIPT_HEADER = 'X-Velum-Receipt';

export class VelumError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'VelumError';
    this.status = status;
  }
}

/** Thrown by requirePayment — respond with 402 and ask the buyer to pay. */
export class PaymentRequiredError extends VelumError {
  constructor(message: string) {
    super(message, 402);
    this.name = 'PaymentRequiredError';
  }
}

const API_KEY_PREFIX = 'vk_agent_';
const DEFAULT_BASE_URL = 'http://localhost:3001';

function decodeApiKeyAgentId(apiKey: string): string {
  try {
    const payloadB64 = apiKey.slice(API_KEY_PREFIX.length).split('.')[0];
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    if (typeof payload.agentId !== 'string' || !payload.agentId) {
      throw new Error('missing agentId');
    }

    return payload.agentId;
  } catch {
    throw new VelumError('Invalid Velum API key: could not decode the agent id');
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class VelumAgent {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  /** DB uuid of the agent this API key belongs to. */
  readonly agentId: string;

  constructor(options: VelumOptions) {
    if (!options.apiKey) {
      throw new VelumError(
        'A Velum API key is required (issue one with POST /api/agents/:id/sdk-key)',
      );
    }

    if (!options.apiKey.startsWith(API_KEY_PREFIX)) {
      throw new VelumError(`Velum API keys start with "${API_KEY_PREFIX}"`);
    }

    if (options.proving === 'local') {
      throw new VelumError(
        'proving: "local" is not implemented yet — roadmap. Use proving: "delegated" (the default).',
      );
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? process.env.VELUM_API_URL ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      '',
    );
    this.agentId = decodeApiKeyAgentId(this.apiKey);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const message = typeof body.error === 'string' ? body.error : response.statusText;
      throw new VelumError(`Velum API error (${response.status}): ${message}`, response.status);
    }

    return body as T;
  }

  /** Discover online services, optionally filtered by category/title/description. */
  async findServices(query?: string): Promise<ServiceListing[]> {
    const search = query ? `?query=${encodeURIComponent(query)}` : '';
    const { services } = await this.request<{ services: ServiceListing[] }>(
      `/api/sdk/services${search}`,
    );
    return services;
  }

  /** Create an invoice for a service at its listed price. Expires in 15 minutes. */
  async requestInvoice(serviceId: string): Promise<Invoice> {
    const { invoice } = await this.request<{ invoice: Invoice }>('/api/sdk/invoices', {
      method: 'POST',
      body: JSON.stringify({ serviceId }),
    });
    return invoice;
  }

  /**
   * Pay an invoice confidentially. Proving is delegated to the platform and
   * takes ~30-60s; this method polls until the transfer settles on-chain and
   * resolves with the payment receipt.
   */
  async pay(invoice: Invoice | string, options: PayOptions = {}): Promise<Receipt> {
    const invoiceId = typeof invoice === 'string' ? invoice : invoice.invoiceId;
    const timeoutMs = options.timeoutMs ?? 180_000;
    const pollIntervalMs = options.pollIntervalMs ?? 3_000;

    const { payment } = await this.request<{ payment: { paymentId: string } }>(
      '/api/sdk/payments',
      {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      },
    );

    const deadline = Date.now() + timeoutMs;

    for (;;) {
      await sleep(pollIntervalMs);

      const { payment: state } = await this.request<{ payment: Payment }>(
        `/api/sdk/payments/${payment.paymentId}`,
      );

      if (state.status === 'settled' && state.receipt) {
        return this.verifyReceipt(state.receipt);
      }

      if (state.status === 'failed') {
        throw new VelumError(`Payment failed: ${state.error ?? 'unknown error'}`);
      }

      if (Date.now() > deadline) {
        throw new VelumError(
          `Payment did not settle within ${timeoutMs} ms (last status: ${state.status})`,
        );
      }
    }
  }

  /**
   * Call the paid service endpoint with the receipt attached as the
   * X-Velum-Receipt header. Returns the parsed JSON response.
   */
  async callService<T = unknown>(
    invoice: Invoice,
    body: unknown,
    receipt: Receipt,
    options: CallServiceOptions = {},
  ): Promise<T> {
    const url = options.url ?? invoice.endpointUrl;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [RECEIPT_HEADER]: receipt.token,
      },
      body: JSON.stringify(body ?? {}),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new VelumError(`Service call failed (${response.status}): ${text}`, response.status);
    }

    return (await response.json()) as T;
  }

  /** Verify a receipt JWT against the platform and return its claims. */
  async verifyReceipt(token: string): Promise<Receipt> {
    const result = await this.request<{
      valid: boolean;
      receipt: Omit<Receipt, 'token'> | null;
    }>(`/api/sdk/receipts/verify?receipt=${encodeURIComponent(token)}`);

    if (!result.valid || !result.receipt) {
      throw new VelumError('Receipt is invalid or has expired');
    }

    return { token, ...result.receipt };
  }

  /**
   * Seller-side guard: verifies the X-Velum-Receipt header of an incoming
   * request and checks the payment was made to *this* agent. Throws
   * PaymentRequiredError (status 402) when the request is unpaid.
   */
  async requirePayment(req: IncomingRequestLike): Promise<Receipt> {
    const raw = req.headers[RECEIPT_HEADER.toLowerCase()];
    const token = Array.isArray(raw) ? raw[0] : raw;

    if (!token) {
      throw new PaymentRequiredError(`Payment required: missing ${RECEIPT_HEADER} header`);
    }

    let receipt: Receipt;

    try {
      receipt = await this.verifyReceipt(token);
    } catch {
      throw new PaymentRequiredError('Payment required: receipt is invalid or expired');
    }

    if (receipt.sellerAgentId !== this.agentId) {
      throw new PaymentRequiredError('Payment required: receipt was issued for another seller');
    }

    return receipt;
  }
}

/**
 * Alias of VelumAgent. Use VelumClient on the seller side (requirePayment) and
 * VelumAgent on the buyer side if you like the distinction — they are the same
 * class.
 */
export class VelumClient extends VelumAgent {}
