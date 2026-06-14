/**
 * Hosted demo seller (`POST /demo/research`).
 *
 * Lets the @velum/sdk buy-research example settle against a real, publicly
 * reachable paid service — so the demo doesn't need a localhost seller running.
 * Gated by the `X-Velum-Receipt` header exactly like the SDK's requirePayment(),
 * but the receipt is verified in-process (this is the same platform that signed
 * it). No SDK API key needs to live in the server's env.
 */
import express from 'express';

import { prisma } from '../lib/prisma';
import { verifyReceipt } from '../prover/paymentQueue';

const RECEIPT_HEADER = 'x-velum-receipt';

const router = express.Router();

router.post('/research', async (req, res, next) => {
  try {
    const token = req.get(RECEIPT_HEADER);
    if (!token) {
      return res
        .status(402)
        .json({ error: 'Payment required: missing X-Velum-Receipt header' });
    }

    let claims;
    try {
      claims = verifyReceipt(token);
    } catch {
      return res
        .status(402)
        .json({ error: 'Payment required: receipt is invalid or expired' });
    }

    // The receipt must have been issued to a seller that actually owns this
    // hosted research service — otherwise a receipt minted for a different
    // seller could be replayed against this endpoint.
    const service = await prisma.service.findFirst({
      where: {
        agentId: claims.sellerAgentId,
        endpointUrl: { contains: '/demo/research' },
        status: 'online',
      },
      select: { id: true },
    });

    if (!service) {
      return res
        .status(402)
        .json({ error: 'Payment required: receipt was not issued for this service' });
    }

    // Best-effort reputation bump so the dashboard reflects served requests.
    void prisma.agentReputation
      .update({
        where: { serviceId: service.id },
        data: { totalRequests: { increment: 1 }, successResponses: { increment: 1 } },
      })
      .catch(() => undefined);

    const query = typeof req.body?.query === 'string' ? req.body.query : null;

    return res.status(200).json({
      query,
      findings: [
        'Confidential payments hide amounts on-chain while keeping settlement verifiable.',
        'This response was gated by a Velum receipt — no receipt, no research.',
      ],
      paidWith: claims.txHash,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
