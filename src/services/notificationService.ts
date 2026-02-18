import Notification from '../models/Notification';
import { getIO } from '../config/socket';
import { logger } from '../utils/logger';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const notification = await Notification.create(params);

    // Emit via socket for real-time delivery
    try {
      const io = getIO();
      io.to(`user:${params.userId}`).emit('notification:new', { notification });
    } catch (socketError) {
      logger.error('Failed to emit notification via socket:', socketError);
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    return null;
  }
};
