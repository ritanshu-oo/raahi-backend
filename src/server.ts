import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { initializeSocket } from './config/socket';
import { registerSocketHandlers } from './socket';
import { logger } from './utils/logger';

const startServer = async () => {
  // Connect to MongoDB
  await connectDatabase();

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  const io = initializeSocket(httpServer);
  registerSocketHandlers(io);

  // Start listening
  httpServer.listen(env.port, '0.0.0.0', () => {
    logger.info(`Raahi API server running on port ${env.port}`);
    logger.info(`Environment: ${env.nodeEnv}`);
    logger.info(`Health check: http://localhost:${env.port}/health`);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
