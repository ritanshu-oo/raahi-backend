import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 30;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user!._id })
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit),
      Notification.countDocuments({ userId: req.user!._id }),
      Notification.countDocuments({ userId: req.user!._id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    sendError(res, 'Failed to fetch notifications', 500);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { notificationIds } = req.body;
    await Notification.updateMany(
      { _id: { $in: notificationIds }, userId: req.user!._id },
      { isRead: true }
    );
    sendSuccess(res, { success: true });
  } catch (error: any) {
    sendError(res, 'Failed to mark as read', 500);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { userId: req.user!._id, isRead: false },
      { isRead: true }
    );
    sendSuccess(res, { success: true });
  } catch (error: any) {
    sendError(res, 'Failed to mark all as read', 500);
  }
};
