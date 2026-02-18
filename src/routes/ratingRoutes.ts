import { Router } from 'express';
import {
  getPendingRatings, getParticipantsToRate, submitRatings,
  getMyReceivedRatings, getMyTrustScore,
} from '../controllers/ratingController';

const router = Router();

router.get('/pending', getPendingRatings);
router.get('/my/received', getMyReceivedRatings);
router.get('/my/trust-score', getMyTrustScore);
router.get('/:activityId/participants', getParticipantsToRate);
router.post('/:activityId', submitRatings);

export default router;
