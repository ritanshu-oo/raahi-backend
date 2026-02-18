import { Request, Response, NextFunction } from 'express';
import { firebaseAdmin } from '../config/firebase';
import User, { IUser } from '../models/User';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: IUser;
  firebaseUid?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'No authentication token provided', 401);
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      sendError(res, 'User not found. Please register first.', 401);
      return;
    }

    if (user.isBanned) {
      sendError(res, 'Your account has been suspended.', 403);
      return;
    }

    // Update last active timestamp
    user.lastActiveAt = new Date();
    await user.save();

    req.user = user;
    req.firebaseUid = decodedToken.uid;
    next();
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      sendError(res, 'Token expired. Please refresh.', 401);
      return;
    }
    sendError(res, 'Invalid authentication token', 401);
  }
};
