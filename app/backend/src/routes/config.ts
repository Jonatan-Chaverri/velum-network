import express from 'express';
import { getConfidentialErc20Address } from '../lib/contracts';

const router = express.Router();

/**
 * GET /api/config
 * Get application configuration
 * Returns RPC URL and Confidential ERC20 contract address
 */
router.get('/', async (req, res, next) => {
  try {
    const rpcUrl = process.env.RPC_URL;
    const chainId = 421614;

    if (!rpcUrl) {
      return res.status(500).json({
        error: 'RPC_URL environment variable is not set',
      });
    }

    const confidentialErc20Address = getConfidentialErc20Address();

    res.json({
      success: true,
      config: {
        chain_id: chainId,
        rpc_url: rpcUrl,
        confidential_erc20: confidentialErc20Address,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
