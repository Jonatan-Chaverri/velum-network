import express from 'express';
import { UserService } from '../db/services/userService';

const router = express.Router();

interface DeleteUserRequest {
  address: string;
}

/**
 * POST /api/deleteUser
 * Delete a user by their Ethereum address
 */
router.post('/', async (req, res, next) => {
  try {
    const { address }: DeleteUserRequest = req.body;

    // Validate required fields
    if (!address) {
      return res.status(400).json({
        error: 'Missing required field: address is required',
      });
    }

    // Validate address format (basic check)
    if (!address.startsWith('0x') || address.length !== 42) {
      return res.status(400).json({
        error: 'Invalid address format. Expected Ethereum address (0x...)',
      });
    }

    // Find user by address
    const userToDelete = await UserService.getUserByAddress(address.toLowerCase());

    if (!userToDelete) {
      return res.status(404).json({
        error: 'User not found with the provided address',
      });
    }

    // Delete the user
    await UserService.deleteUser(userToDelete.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        address: userToDelete.address,
        username: userToDelete.name,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

