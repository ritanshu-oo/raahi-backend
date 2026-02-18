import { Request, Response } from 'express';
import { firebaseAdmin } from '../config/firebase';
import User from '../models/User';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firebaseToken, authProvider } = req.body;

    if (!firebaseToken || !authProvider) {
      sendError(res, 'firebaseToken and authProvider are required', 400);
      return;
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        firebaseUid: decodedToken.uid,
        phone: decodedToken.phone_number || undefined,
        email: decodedToken.email || undefined,
        authProvider,
        name: decodedToken.name || 'Traveler',
        profilePhoto: decodedToken.picture || undefined,
      });
      logger.info(`New user created: ${user._id}`);
    }

    sendSuccess(res, {
      user,
      isNewUser,
      isProfileComplete: user.isProfileComplete,
    });
  } catch (error: any) {
    logger.error('Token verification error:', error);
    sendError(res, 'Invalid Firebase token', 401);
  }
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    user.isActive = false;
    await user.save();

    sendSuccess(res, { message: 'Account deactivated successfully' });
  } catch (error: any) {
    logger.error('Delete account error:', error);
    sendError(res, 'Failed to delete account', 500);
  }
};
