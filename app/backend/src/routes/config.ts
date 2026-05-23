import express from 'express';
import { ContractService } from '../db/services/contractService';

const router = express.Router();

/**
 * GET /api/config
 * Get application configuration
 * Returns RPC URL and Confidential ERC20 contract address
 */
router.get('/', async (req, res, next) => {
  try {
    const rpcUrl = process.env.RPC_URL;
    const network = process.env.NETWORK;

    if (!rpcUrl) {
      return res.status(500).json({
        error: 'RPC_URL environment variable is not set',
      });
    }

    if (!network) {
      return res.status(500).json({
        error: 'NETWORK environment variable is not set',
      });
    }

    // Get Confidential ERC20 contract from database
    const contract = await ContractService.getContractByNameAndNetwork(
      'CONFIDENTIAL_ERC20',
      network
    );

    if (!contract) {
      return res.status(404).json({
        error: `Contract with name CONFIDENTIAL_ERC20 and network ${network} not found`,
      });
    }

    res.json({
      success: true,
      config: {
        rpc_url: rpcUrl,
        confidential_erc20: contract.address,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

