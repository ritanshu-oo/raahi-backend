import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { firebaseAdmin } from './firebase';
import { logger } from '../utils/logger';
import User from '../models/User';

let io: Server;

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      const user = await User.findOne({ firebaseUid: decodedToken.uid });

      if (!user) {
        return next(new Error('User not found'));
      }

      (socket as any).userId = user._id.toString();
      (socket as any).firebaseUid = decodedToken.uid;
      next();
    } catch (error) {
      logger.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info(`Socket connected: ${userId}`);

    // Join user's personal room for targeted notifications
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized (expected in serverless)');
  }
  return io;
};
