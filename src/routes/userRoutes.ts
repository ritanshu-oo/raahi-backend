import { Router } from 'express';
import {
  getMe, updateMe, updateProfilePhoto, updateProfileSetup,
  submitVerification, getVerificationStatus, updatePushToken,
  updateLocation, updateSettings, updateEmergencyContacts,
  getUserProfile, getUserReviews,
} from '../controllers/userController';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/profile-photo', upload.single('photo'), updateProfilePhoto);
router.put('/me/setup/:step', updateProfileSetup);
router.post('/me/verification', upload.array('files', 2), submitVerification);
router.get('/me/verification/status', getVerificationStatus);
router.put('/me/push-token', updatePushToken);
router.put('/me/location', updateLocation);
router.put('/me/settings', updateSettings);
router.put('/me/emergency-contacts', updateEmergencyContacts);

router.get('/:userId', getUserProfile);
router.get('/:userId/reviews', getUserReviews);

export default router;
