import { Router } from 'express';
import {
  getMyChatRooms, getMessages, getChatParticipants, markMessagesRead,
  getOrCreateDM,
} from '../controllers/chatController';

const router = Router();

router.get('/', getMyChatRooms);
router.post('/dm/:hostUserId', getOrCreateDM);
router.get('/:chatRoomId/messages', getMessages);
router.get('/:chatRoomId/participants', getChatParticipants);
router.post('/:chatRoomId/read', markMessagesRead);

export default router;
