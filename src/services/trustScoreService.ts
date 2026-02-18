import User, { IUser } from '../models/User';
import Rating from '../models/Rating';
import { logger } from '../utils/logger';

export interface TrustScoreBreakdown {
  overallScore: number;
  participantRatings: number;
  hostingScore: number;
  joinScore: number;
  verificationBonus: number;
}

export const calculateTrustScore = async (userId: string): Promise<TrustScoreBreakdown> => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const ratings = await Rating.find({ rateeId: userId });

  // 1. Participant Ratings Average (40% weight)
  const ratingsAvg =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
      : 0;

  // 2. Hosting Score (25% weight) - max 5.0
  const hostingBase = Math.min(5, user.activitiesHostedCount * 0.5);

  // 3. Join Score (20% weight) - max 5.0
  const joinBase = Math.min(5, user.activitiesJoinedCount * 0.35);

  // 4. Verification Bonus (15% weight) - 0 or 5
  const verificationScore = user.verification.status === 'verified' ? 5 : 0;

  // Weighted total
  const overall =
    ratingsAvg * 0.4 +
    hostingBase * 0.25 +
    joinBase * 0.2 +
    verificationScore * 0.15;

  const breakdown: TrustScoreBreakdown = {
    overallScore: Math.round(overall * 10) / 10,
    participantRatings: Math.round(ratingsAvg * 10) / 10,
    hostingScore: Math.round(hostingBase * 10) / 10,
    joinScore: Math.round(joinBase * 10) / 10,
    verificationBonus: verificationScore,
  };

  // Update user's trust score
  await User.findByIdAndUpdate(userId, {
    trustScore: breakdown.overallScore,
    totalRatingsReceived: ratings.length,
    totalRatingsSum: ratings.reduce((sum, r) => sum + r.score, 0),
  });

  return breakdown;
};

export const recalculateAfterRating = async (rateeId: string): Promise<void> => {
  try {
    await calculateTrustScore(rateeId);
  } catch (error) {
    logger.error('Trust score recalculation error:', error);
  }
};
