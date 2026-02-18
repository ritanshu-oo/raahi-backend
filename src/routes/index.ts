import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import tripRoutes from './tripRoutes';
import activityRoutes from './activityRoutes';
import chatRoutes from './chatRoutes';
import ratingRoutes from './ratingRoutes';
import reportRoutes from './reportRoutes';
import notificationRoutes from './notificationRoutes';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/users', authMiddleware, userRoutes);
router.use('/trips', authMiddleware, tripRoutes);
router.use('/activities', authMiddleware, activityRoutes);
router.use('/chats', authMiddleware, chatRoutes);
router.use('/ratings', authMiddleware, ratingRoutes);
router.use('/reports', authMiddleware, reportRoutes);
router.use('/notifications', authMiddleware, notificationRoutes);

export default router;
