import { Router } from 'express';
import {
  createTrip, getTrips, getActiveTrip, getTripById,
  updateTrip, deleteTrip, getTravelersInCity,
} from '../controllers/tripController';

const router = Router();

router.post('/', createTrip);
router.get('/', getTrips);
router.get('/active', getActiveTrip);
router.get('/travelers', getTravelersInCity);
router.get('/:tripId', getTripById);
router.put('/:tripId', updateTrip);
router.delete('/:tripId', deleteTrip);

export default router;
