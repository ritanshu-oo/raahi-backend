import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Trip from '../models/Trip';
import User from '../models/User';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { POPULAR_CITIES } from '../utils/constants';
import { logger } from '../utils/logger';

export const createTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { city, state, startDate, endDate, mood } = req.body;

    // Find coordinates from popular cities or use provided
    const popularCity = POPULAR_CITIES.find((c) => c.name === city);
    const coordinates = req.body.coordinates || popularCity?.coordinates;

    const trip = await Trip.create({
      userId: req.user!._id,
      city,
      state: state || popularCity?.state,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      mood,
      location: coordinates
        ? { type: 'Point', coordinates }
        : undefined,
      status: new Date(startDate) <= new Date() ? 'active' : 'upcoming',
    });

    sendSuccess(res, { trip }, 201);
  } catch (error: any) {
    logger.error('Create trip error:', error);
    sendError(res, 'Failed to create trip', 500);
  }
};

export const getTrips = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const query: Record<string, any> = { userId: req.user!._id };

    if (status) {
      query.status = { $in: status.split(',') };
    }

    const trips = await Trip.find(query).sort({ startDate: 1 });
    sendSuccess(res, { trips });
  } catch (error: any) {
    sendError(res, 'Failed to fetch trips', 500);
  }
};

export const getActiveTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // First try to find an explicitly active trip
    let trip = await Trip.findOne({ userId: req.user!._id, status: 'active' });

    // Auto-activate upcoming trips whose dates have started
    if (!trip) {
      trip = await Trip.findOneAndUpdate(
        {
          userId: req.user!._id,
          status: 'upcoming',
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
        { status: 'active' },
        { new: true }
      );
    }

    sendSuccess(res, { trip });
  } catch (error: any) {
    sendError(res, 'Failed to fetch active trip', 500);
  }
};

export const getTripById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.tripId,
      userId: req.user!._id,
    });

    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    sendSuccess(res, { trip });
  } catch (error: any) {
    sendError(res, 'Failed to fetch trip', 500);
  }
};

export const updateTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowedFields = ['city', 'state', 'startDate', 'endDate', 'mood'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.tripId, userId: req.user!._id },
      updates,
      { new: true }
    );

    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    sendSuccess(res, { trip });
  } catch (error: any) {
    sendError(res, 'Failed to update trip', 500);
  }
};

export const deleteTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.tripId, userId: req.user!._id },
      { status: 'cancelled' },
      { new: true }
    );

    if (!trip) {
      sendError(res, 'Trip not found', 404);
      return;
    }

    sendSuccess(res, { success: true });
  } catch (error: any) {
    sendError(res, 'Failed to cancel trip', 500);
  }
};

export const getTravelersInCity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { city, startDate, endDate } = req.query;

    if (!city) {
      sendError(res, 'City is required', 400);
      return;
    }

    // Find trips overlapping with the given dates
    const query: Record<string, any> = {
      city,
      status: { $in: ['active', 'upcoming'] },
      userId: { $ne: req.user!._id },
    };

    if (startDate && endDate) {
      query.startDate = { $lte: new Date(endDate as string) };
      query.endDate = { $gte: new Date(startDate as string) };
    }

    const trips = await Trip.find(query).populate(
      'userId',
      'name profilePhoto gender travelStyle interests verification.status trustScore'
    );

    const travelers = trips.map((trip) => ({
      user: trip.userId,
      tripDates: { start: trip.startDate, end: trip.endDate },
      mood: trip.mood,
    }));

    sendSuccess(res, { travelers, count: travelers.length });
  } catch (error: any) {
    sendError(res, 'Failed to fetch travelers', 500);
  }
};
