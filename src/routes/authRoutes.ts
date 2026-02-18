import { Router } from 'express';
import { verifyToken, deleteAccount } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/verify-token', verifyToken);
router.delete('/account', authMiddleware, deleteAccount);

export default router;
