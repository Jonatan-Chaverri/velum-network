import express from 'express';
import { UserService } from '../db/services/userService';

const router = express.Router();

interface GetUserRequest {
  address?: string;
  username?: string;
}

/**
 * GET /api/getUser
 * Get user by address and/or username
 * Returns 404 if user not found
 */
router.get('/', async (req, res, next) => {
  try {
    const { address, username }: GetUserRequest = req.query;

    // Validate that at least one parameter is provided
    if (!address && !username) {
      return res.status(400).json({
        error: 'At least one of the following parameters is required: address, username',
      });
    }

    let user = null;

    // If both address and username are provided, prioritize address (more unique)
    if (address) {
      // Validate address format
      if (!address.startsWith('0x') || address.length !== 42) {
        return res.status(400).json({
          error: 'Invalid address format. Expected Ethereum address (0x...)',
        });
      }

      user = await UserService.getUserByAddress(address.toLowerCase());
    }

    // If user not found by address and username is provided, try username
    if (!user && username) {
      user = await UserService.getUserByUsername(username);
    }

    // If user still not found, return 404
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Return user (excluding sensitive information if any)
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        address: user.address,
        public_key_x: user.public_key_x,
        public_key_y: user.public_key_y,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

