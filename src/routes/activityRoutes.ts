import { Router } from 'express';
import {
  createActivity, getFeed, searchActivities, getMapActivities,
  getActivityById, requestJoinActivity, withdrawJoinRequest, leaveActivity, joinWaitlist,
  updateActivity, cancelActivity, getMyHosted, getMyJoined,
  approveJoinRequest, rejectJoinRequest, removeParticipant, getPendingRequests,
} from '../controllers/activityController';

const router = Router();

router.post('/', createActivity);
router.get('/feed', getFeed);
router.get('/search', searchActivities);
router.get('/map', getMapActivities);
router.get('/my/hosted', getMyHosted);
router.get('/my/joined', getMyJoined);
router.get('/:activityId', getActivityById);
router.post('/:activityId/request-join', requestJoinActivity);
router.post('/:activityId/withdraw-request', withdrawJoinRequest);
router.post('/:activityId/leave', leaveActivity);
router.post('/:activityId/waitlist', joinWaitlist);
router.put('/:activityId', updateActivity);
router.delete('/:activityId', cancelActivity);
router.get('/:activityId/requests', getPendingRequests);
router.put('/:activityId/requests/:userId/approve', approveJoinRequest);
router.put('/:activityId/requests/:userId/reject', rejectJoinRequest);
router.delete('/:activityId/participants/:userId', removeParticipant);

export default router;
