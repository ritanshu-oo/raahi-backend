import { Router } from 'express';
import {
  getNotifications, markAsRead, markAllAsRead,
} from '../controllers/notificationController';

const router = Router();

router.get('/', getNotifications);
router.put('/read', markAsRead);
router.put('/read-all', markAllAsRead);

export default router;
