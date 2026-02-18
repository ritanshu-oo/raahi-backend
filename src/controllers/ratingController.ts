import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Activity from '../models/Activity';
import Rating from '../models/Rating';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { recalculateAfterRating } from '../services/trustScoreService';
import { calculateTrustScore } from '../services/trustScoreService';
import { logger } from '../utils/logger';

export const getPendingRatings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Find completed activities where user was a participant and hasn't rated yet
    const activities = await Activity.find({
      'participants.userId': req.user!._id,
      'participants.status': 'confirmed',
      status: 'completed',
      dateTime: { $lt: new Date() },
    }).populate('hostId', 'name profilePhoto');

    // Filter out activities the user has already rated
    const pendingActivities = [];
    for (const activity of activities) {
      const existingRating = await Rating.findOne({
        activityId: activity._id,
        raterId: req.user!._id,
      });
      if (!existingRating) {
        pendingActivities.push(activity);
      }
    }

    sendSuccess(res, { activities: pendingActivities });
  } catch (error: any) {
    sendError(res, 'Failed to fetch pending ratings', 500);
  }
};

export const getParticipantsToRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findById(req.params.activityId)
      .populate('participants.userId', 'name profilePhoto verification.status trustScore');

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    // Filter out the current user and get only confirmed participants
    const participants = activity.participants
      .filter(p => p.status === 'confirmed' && p.userId._id.toString() !== req.user!._id.toString())
      .map(p => p.userId);

    sendSuccess(res, { participants });
  } catch (error: any) {
    sendError(res, 'Failed to fetch participants', 500);
  }
};

export const submitRatings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ratings } = req.body;
    const activityId = req.params.activityId;

    if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
      sendError(res, 'Ratings array is required', 400);
      return;
    }

    const createdRatings = [];
    for (const rating of ratings) {
      const created = await Rating.create({
        activityId,
        raterId: req.user!._id,
        rateeId: rating.rateeId,
        score: rating.score,
        tags: rating.tags || [],
        comment: rating.comment,
      });
      createdRatings.push(created);

      // Recalculate trust score for each rated user
      await recalculateAfterRating(rating.rateeId);
    }

    sendSuccess(res, { ratings: createdRatings, count: createdRatings.length });
  } catch (error: any) {
    logger.error('Submit ratings error:', error);
    sendError(res, 'Failed to submit ratings', 500);
  }
};

export const getMyReceivedRatings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;
    const filter = req.query.filter as string; // 'host' | 'participant' | undefined

    const query: Record<string, any> = { rateeId: req.user!._id };

    const [ratings, total] = await Promise.all([
      Rating.find(query)
        .populate('raterId', 'name profilePhoto verification.status')
        .populate('activityId', 'title dateTime')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit),
      Rating.countDocuments(query),
    ]);

    sendPaginated(res, ratings, total, page, limit);
  } catch (error: any) {
    sendError(res, 'Failed to fetch received ratings', 500);
  }
};

export const getMyTrustScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const breakdown = await calculateTrustScore(req.user!._id.toString());
    sendSuccess(res, { breakdown });
  } catch (error: any) {
    sendError(res, 'Failed to fetch trust score', 500);
  }
};
