import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import ChatRoom from '../models/ChatRoom';
import Message from '../models/Message';
import User from '../models/User';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { logger } from '../utils/logger';

export const getMyChatRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info(`[getMyChatRooms] User: ${req.user!._id}`);
    const chatRooms = await ChatRoom.find({
      participants: req.user!._id,
      isActive: true,
    })
      .populate('activityId', 'title dateTime city status emoji')
      .populate('participants', 'name profilePhoto')
      .populate('relatedActivityId', 'title emoji')
      .populate('lastMessage.senderId', 'name')
      .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 });

    logger.info(`[getMyChatRooms] Found ${chatRooms.length} rooms`);
    sendSuccess(res, { chatRooms });
  } catch (error: any) {
    logger.error('[getMyChatRooms] Error:', error);
    sendError(res, 'Failed to fetch chat rooms', 500);
  }
};

export const getOrCreateDM = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hostUserId } = req.params;
    const activityId = req.query.activityId as string;

    if (hostUserId === req.user!._id.toString()) {
      sendError(res, 'Cannot create a DM with yourself', 400);
      return;
    }

    // Verify the other user exists
    const otherUser = await User.findById(hostUserId);
    if (!otherUser) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Sort IDs for consistent lookup
    const sortedIds = [req.user!._id.toString(), hostUserId].sort();
    const dmParticipants = sortedIds.map((id) => new mongoose.Types.ObjectId(id));

    // Try to find existing DM
    let chatRoom = await ChatRoom.findOne({
      type: 'dm',
      dmParticipants: { $all: dmParticipants, $size: 2 },
    })
      .populate('participants', 'name profilePhoto')
      .populate('relatedActivityId', 'title emoji');

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        type: 'dm',
        participants: dmParticipants,
        dmParticipants,
        relatedActivityId: activityId || undefined,
        isActive: true,
      });

      // Populate after create
      chatRoom = await ChatRoom.findById(chatRoom._id)
        .populate('participants', 'name profilePhoto')
        .populate('relatedActivityId', 'title emoji');
    }

    sendSuccess(res, { chatRoom });
  } catch (error: any) {
    logger.error('Get/create DM error:', error);
    sendError(res, 'Failed to create direct message', 500);
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatRoomId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    // Verify the user is a participant
    const chatRoom = await ChatRoom.findOne({
      _id: chatRoomId,
      participants: req.user!._id,
    });

    if (!chatRoom) {
      sendError(res, 'Chat room not found or access denied', 403);
      return;
    }

    const query: Record<string, any> = { chatRoomId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .limit(limit);

    sendSuccess(res, { messages: messages.reverse(), hasMore: messages.length === limit });
  } catch (error: any) {
    sendError(res, 'Failed to fetch messages', 500);
  }
};

export const getChatParticipants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chatRoom = await ChatRoom.findOne({
      _id: req.params.chatRoomId,
      participants: req.user!._id,
    }).populate('participants', 'name profilePhoto gender verification.status trustScore');

    if (!chatRoom) {
      sendError(res, 'Chat room not found or access denied', 403);
      return;
    }

    sendSuccess(res, { participants: chatRoom.participants });
  } catch (error: any) {
    sendError(res, 'Failed to fetch participants', 500);
  }
};

export const markMessagesRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageIds } = req.body;

    await Message.updateMany(
      { _id: { $in: messageIds }, chatRoomId: req.params.chatRoomId },
      { $addToSet: { readBy: req.user!._id } }
    );

    sendSuccess(res, { success: true });
  } catch (error: any) {
    sendError(res, 'Failed to mark messages as read', 500);
  }
};
