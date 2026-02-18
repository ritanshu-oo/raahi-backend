import { Server, Socket } from 'socket.io';
import ChatRoom from '../models/ChatRoom';
import Message from '../models/Message';
import User from '../models/User';
import { logger } from '../utils/logger';

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = (socket as any).userId;

  // Join a chat room
  socket.on('chat:join', async ({ chatRoomId }: { chatRoomId: string }) => {
    try {
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        participants: userId,
      });

      if (!chatRoom) {
        socket.emit('error', { message: 'Not authorized to join this chat' });
        return;
      }

      socket.join(`chat:${chatRoomId}`);
      logger.debug(`User ${userId} joined chat room ${chatRoomId}`);
    } catch (error) {
      logger.error('Chat join error:', error);
    }
  });

  // Leave a chat room
  socket.on('chat:leave', ({ chatRoomId }: { chatRoomId: string }) => {
    socket.leave(`chat:${chatRoomId}`);
  });

  // Send a message
  socket.on('chat:message:send', async (data: {
    chatRoomId: string;
    text: string;
    type?: string;
  }) => {
    try {
      const { chatRoomId, text, type = 'text' } = data;

      // Verify participant
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        participants: userId,
      });

      if (!chatRoom) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      // Create message
      const message = await Message.create({
        chatRoomId,
        senderId: userId,
        type,
        text,
        readBy: [userId],
      });

      // Populate sender info
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name profilePhoto');

      // Update last message on chat room
      await ChatRoom.findByIdAndUpdate(chatRoomId, {
        lastMessage: {
          text,
          senderId: userId,
          sentAt: new Date(),
        },
      });

      // Broadcast to all room members
      io.to(`chat:${chatRoomId}`).emit('chat:message:new', {
        message: populatedMessage,
        chatRoomId,
      });
    } catch (error) {
      logger.error('Send message error:', error);
    }
  });

  // Typing indicators
  socket.on('chat:typing:start', async ({ chatRoomId }: { chatRoomId: string }) => {
    try {
      const user = await User.findById(userId).select('name');
      socket.to(`chat:${chatRoomId}`).emit('chat:typing', {
        chatRoomId,
        userId,
        userName: user?.name || 'Someone',
        isTyping: true,
      });
    } catch {}
  });

  socket.on('chat:typing:stop', ({ chatRoomId }: { chatRoomId: string }) => {
    socket.to(`chat:${chatRoomId}`).emit('chat:typing', {
      chatRoomId,
      userId,
      isTyping: false,
    });
  });

  // Read receipts
  socket.on('chat:messages:read', async (data: {
    chatRoomId: string;
    messageIds: string[];
  }) => {
    try {
      await Message.updateMany(
        { _id: { $in: data.messageIds } },
        { $addToSet: { readBy: userId } }
      );

      socket.to(`chat:${data.chatRoomId}`).emit('chat:messages:read-receipt', {
        chatRoomId: data.chatRoomId,
        userId,
        messageIds: data.messageIds,
      });
    } catch (error) {
      logger.error('Read receipt error:', error);
    }
  });
};
