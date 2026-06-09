import express from 'express';
import { getWethTokenAddress } from '../lib/contracts';

const router = express.Router();

/**
 * GET /api/tokens
 * Returns token addresses from environment configuration
 */
router.get('/', async (req, res, next) => {
  try {
    const network = process.env.NETWORK;
    if (!network) {
      return res.status(500).json({
        error: 'NETWORK environment variable is not set',
      });
    }

    const wethTokenAddress = getWethTokenAddress();

    res.json({
      tokens: [
        {
          name: 'WETH_TOKEN_ADDRESS',
          network,
          address: wethTokenAddress,
        },
      ],
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
