import express from 'express';
import { ContractService } from '../db/services/contractService';

const router = express.Router();

/**
 * GET /api/tokens
 * Get contract with name='WETH_TOKEN_ADDRESS' from contracts table
 * Returns the contract in the specified format
 */
router.get('/', async (req, res, next) => {
  try {
    const network = process.env.NETWORK;
    if (!network) {
      return res.status(500).json({
        error: 'NETWORK environment variable is not set',
      });
    }

    const contract = await ContractService.getContractByNameAndNetwork(
      'WETH_TOKEN_ADDRESS',
      network
    );

    if (!contract) {
      return res.status(404).json({
        error: `Contract with name WETH_TOKEN_ADDRESS and network ${network} not found`,
      });
    }

    // Return in the specified format
    res.json({
      tokens: [
        {
          name: contract.name,
          network: contract.network,
          address: contract.address,
        },
      ],
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

