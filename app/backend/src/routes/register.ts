import express from 'express';
import { UserService } from '../db/services/userService';

const router = express.Router();

interface RegisterRequest {
  address: string;
  username: string;
  publicKey: {
    x: string;
    y: string;
  };
}

/**
 * POST /api/register
 * Register a new user with address, username, and public key
 * The client should generate the keypair and provide the public key
 */
router.post('/', async (req, res, next) => {
  try {
    const { address, username, publicKey }: RegisterRequest = req.body;

    // Validate required fields
    if (!address || !username || !publicKey) {
      return res.status(400).json({
        error: 'Missing required fields: address, username, and publicKey are required',
      });
    }

    // Validate address format (basic check)
    if (!address.startsWith('0x') || address.length !== 42) {
      return res.status(400).json({
        error: 'Invalid address format. Expected Ethereum address (0x...)',
      });
    }

    // Validate username format
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        error: 'Username must be between 3 and 50 characters',
      });
    }

    // Validate public key format
    if (!publicKey.x || !publicKey.y) {
      return res.status(400).json({
        error: 'Invalid public key format. Expected x and y coordinates',
      });
    }

    // Check if user with same address exists
    const existingUserByAddress = await UserService.getUserByAddress(address);
    if (existingUserByAddress) {
      return res.status(409).json({
        error: 'User with this address already exists',
      });
    }

    // Check if user with same username exists
    const existingUserByUsername = await UserService.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(409).json({
        error: 'Username already taken',
      });
    }

    // Create user with provided public key coordinates
    const user = await UserService.createUser({
      name: username,
      address: address.toLowerCase(), // Normalize to lowercase
      public_key_x: publicKey.x,
      public_key_y: publicKey.y,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        username: user.name,
        created_at: user.created_at,
      },
      publicKey: {
        x: publicKey.x,
        y: publicKey.y,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

