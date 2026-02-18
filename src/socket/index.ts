import { Server } from 'socket.io';
import { registerChatHandlers } from './chatHandler';
import { logger } from '../utils/logger';

export const registerSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    logger.info(`Socket handlers registered for: ${userId}`);

    // Register domain-specific handlers
    registerChatHandlers(io, socket);

    // Activity room subscriptions
    socket.on('activity:subscribe', ({ activityId }: { activityId: string }) => {
      socket.join(`activity:${activityId}`);
    });

    socket.on('activity:unsubscribe', ({ activityId }: { activityId: string }) => {
      socket.leave(`activity:${activityId}`);
    });

    // User presence
    socket.on('user:online', () => {
      socket.broadcast.emit('user:status', { userId, isOnline: true });
    });

    socket.on('disconnect', () => {
      socket.broadcast.emit('user:status', { userId, isOnline: false });
    });
  });
};
