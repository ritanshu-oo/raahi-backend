import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Rating from '../models/Rating';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { logger } from '../utils/logger';

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, { user: req.user });
};

export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowedFields = [
      'name', 'gender', 'languages', 'travelStyle', 'interests', 'bio',
    ];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.user!._id, updates, { new: true });
    sendSuccess(res, { user });
  } catch (error: any) {
    logger.error('Update user error:', error);
    sendError(res, 'Failed to update profile', 500);
  }
};

export const updateProfilePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let photoUrl: string;

    if (req.file) {
      // Multer file upload → upload to Cloudinary server-side
      photoUrl = await uploadToCloudinary(req.file.buffer, 'profiles');
    } else if (req.body.profilePhoto) {
      // Client-side Cloudinary upload → accept URL directly
      photoUrl = req.body.profilePhoto;
    } else {
      sendError(res, 'No photo provided', 400);
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { profilePhoto: photoUrl },
      { new: true }
    );

    sendSuccess(res, { user, photoUrl });
  } catch (error: any) {
    logger.error('Photo upload error:', error);
    sendError(res, 'Failed to upload photo', 500);
  }
};

export const updateProfileSetup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const step = parseInt(req.params.step, 10);
    if (step < 1 || step > 4) {
      sendError(res, 'Invalid setup step (1-4)', 400);
      return;
    }

    const updates: Record<string, any> = { profileSetupStep: step };

    // Step-specific field mapping
    switch (step) {
      case 1: // Photo + Name
        if (req.body.name) updates.name = req.body.name;
        if (req.body.profilePhoto) updates.profilePhoto = req.body.profilePhoto;
        break;
      case 2: // Gender + Languages
        if (req.body.gender) updates.gender = req.body.gender;
        if (req.body.languages) updates.languages = req.body.languages;
        break;
      case 3: // Travel Style + Interests
        if (req.body.travelStyle) updates.travelStyle = req.body.travelStyle;
        if (req.body.interests) updates.interests = req.body.interests;
        break;
      case 4: // Bio + complete
        if (req.body.bio) updates.bio = req.body.bio;
        updates.isProfileComplete = true;
        break;
    }

    const user = await User.findByIdAndUpdate(req.user!._id, updates, { new: true });
    sendSuccess(res, { user });
  } catch (error: any) {
    logger.error('Profile setup error:', error);
    sendError(res, 'Failed to update profile setup', 500);
  }
};

export const submitVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let govIdUrl: string;
    let selfieUrl: string;

    if (req.files && Array.isArray(req.files) && req.files.length >= 2) {
      // Multer file uploads → upload to Cloudinary server-side
      const [govIdFile, selfieFile] = req.files as Express.Multer.File[];
      govIdUrl = await uploadToCloudinary(govIdFile.buffer, 'verification');
      selfieUrl = await uploadToCloudinary(selfieFile.buffer, 'verification');
    } else if (req.body.governmentIdUrl && req.body.selfieUrl) {
      // Client-side Cloudinary uploads → accept URLs directly
      govIdUrl = req.body.governmentIdUrl;
      selfieUrl = req.body.selfieUrl;
    } else {
      sendError(res, 'Government ID and selfie are required', 400);
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        verification: {
          status: 'pending',
          governmentIdUrl: govIdUrl,
          selfieUrl: selfieUrl,
          submittedAt: new Date(),
        },
      },
      { new: true }
    );

    sendSuccess(res, { verification: user!.verification });
  } catch (error: any) {
    logger.error('Verification submission error:', error);
    sendError(res, 'Failed to submit verification', 500);
  }
};

export const getVerificationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, { status: req.user!.verification.status });
};

export const updatePushToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.user!._id, {
      expoPushToken: req.body.expoPushToken,
    });
    sendSuccess(res, { success: true });
  } catch (error: any) {
    sendError(res, 'Failed to update push token', 500);
  }
};

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.body;
    await User.findByIdAndUpdate(req.user!._id, {
      lastKnownLocation: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    });
    sendSuccess(res, { success: true });
  } catch (error: any) {
    sendError(res, 'Failed to update location', 500);
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { settings: { ...req.user!.settings, ...req.body.settings } },
      { new: true }
    );
    sendSuccess(res, { settings: user!.settings });
  } catch (error: any) {
    sendError(res, 'Failed to update settings', 500);
  }
};

export const updateEmergencyContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { emergencyContacts: req.body.contacts },
      { new: true }
    );
    sendSuccess(res, { contacts: user!.emergencyContacts });
  } catch (error: any) {
    sendError(res, 'Failed to update emergency contacts', 500);
  }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name profilePhoto gender travelStyle interests bio verification.status trustScore activitiesHostedCount activitiesJoinedCount badges totalRatingsReceived');

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Find shared interests
    const currentUserInterests = req.user!.interests || [];
    const sharedInterests = (user.interests || []).filter((i) =>
      currentUserInterests.includes(i)
    );

    sendSuccess(res, { user, sharedInterests });
  } catch (error: any) {
    sendError(res, 'Failed to fetch user profile', 500);
  }
};

export const getUserReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    const [reviews, total] = await Promise.all([
      Rating.find({ rateeId: req.params.userId })
        .populate('raterId', 'name profilePhoto verification.status')
        .populate('activityId', 'title')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit),
      Rating.countDocuments({ rateeId: req.params.userId }),
    ]);

    sendPaginated(res, reviews, total, page, limit);
  } catch (error: any) {
    sendError(res, 'Failed to fetch reviews', 500);
  }
};
