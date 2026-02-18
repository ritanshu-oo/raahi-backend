import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Activity from '../models/Activity';
import ChatRoom from '../models/ChatRoom';
import Message from '../models/Message';
import User from '../models/User';
import Trip from '../models/Trip';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getIO } from '../config/socket';
import { logger } from '../utils/logger';
import { createNotification } from '../services/notificationService';

export const createActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      tripId, title, description, emoji, coverImage, categories,
      city, venueName, venueAddress, coordinates,
      dateTime, duration, maxParticipants, mood,
    } = req.body;

    const activityData: Record<string, any> = {
      hostId: req.user!._id,
      title,
      description,
      emoji,
      coverImage,
      categories: categories || [],
      city,
      venueName,
      venueAddress,
      location: coordinates ? { type: 'Point', coordinates } : undefined,
      dateTime: new Date(dateTime),
      duration,
      maxParticipants,
      mood,
      participants: [{
        userId: req.user!._id,
        joinedAt: new Date(),
        status: 'confirmed',
      }],
      genderCount: {
        male: req.user!.gender === 'male' ? 1 : 0,
        female: req.user!.gender === 'female' ? 1 : 0,
        other: !['male', 'female'].includes(req.user!.gender || '') ? 1 : 0,
      },
    };

    // Only add tripId if provided
    if (tripId) {
      activityData.tripId = tripId;
    }

    const activity = await Activity.create(activityData);

    // Auto-create group chat room
    const chatRoom = await ChatRoom.create({
      activityId: activity._id,
      type: 'group',
      participants: [req.user!._id],
    });

    activity.chatRoomId = chatRoom._id;
    await activity.save();

    // Update hosted count
    await User.findByIdAndUpdate(req.user!._id, {
      $inc: { activitiesHostedCount: 1 },
    });

    sendSuccess(res, { activity, chatRoom }, 201);
  } catch (error: any) {
    logger.error('Create activity error:', error.message, error.stack);
    console.error('CREATE ACTIVITY ERROR:', JSON.stringify(error.errors || error.message));
    sendError(res, error.message || 'Failed to create activity', 500);
  }
};

export const getFeed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;
    const { category, mood, dateFilter } = req.query;
    const mode = (req.query.mode as string) || 'city';

    const query: Record<string, any> = {
      status: 'active',
      dateTime: { $gte: new Date() },
    };

    if (mode === 'city') {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseInt(req.query.radius as string) || 10000;

      if (!isNaN(lat) && !isNaN(lng)) {
        query.location = {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radius,
          },
        };
      } else if (req.query.city) {
        query.city = { $regex: new RegExp(req.query.city as string, 'i') };
      }
    } else if (mode === 'trip') {
      const tripCity = req.query.tripCity as string;
      const tripStartDate = req.query.tripStartDate as string;
      const tripEndDate = req.query.tripEndDate as string;

      if (tripCity) query.city = { $regex: new RegExp(tripCity, 'i') };
      if (tripStartDate) query.dateTime.$gte = new Date(tripStartDate);
      if (tripEndDate) query.dateTime.$lte = new Date(tripEndDate);
      // Only show trip-associated activities in trip mode
      query.tripId = { $exists: true, $ne: null };
    }

    if (category) query.categories = category;
    if (mood) query.mood = mood;

    if (dateFilter === 'today') {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.dateTime.$lte = endOfDay;
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);
      query.dateTime.$gte = tomorrow;
      query.dateTime.$lte = endOfTomorrow;
    } else if (dateFilter === 'week') {
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      query.dateTime.$lte = endOfWeek;
    }

    const runQuery = async (q: Record<string, any>) => {
      const [docs, count] = await Promise.all([
        Activity.find(q)
          .populate('hostId', 'name profilePhoto trustScore verification.status gender')
          .populate('participants.userId', 'name profilePhoto gender')
          .sort({ dateTime: 1 })
          .skip(page * limit)
          .limit(limit),
        Activity.countDocuments(q),
      ]);
      return { docs, count };
    };

    let activities: any[] = [];
    let total = 0;

    if (query.location) {
      // Try geospatial query first; fall back to all activities if it fails or returns empty
      try {
        const result = await runQuery(query);
        activities = result.docs;
        total = result.count;
      } catch (nearErr: any) {
        console.log('[Feed] $near query failed, falling back:', nearErr.message);
      }

      if (activities.length === 0) {
        const fallbackQuery = { ...query };
        delete fallbackQuery.location;
        console.log('[Feed] No nearby activities, showing all');
        const result = await runQuery(fallbackQuery);
        activities = result.docs;
        total = result.count;
      }
    } else {
      const result = await runQuery(query);
      activities = result.docs;
      total = result.count;
    }

    // Post-filter: only activities with available slots
    const activitiesWithSlots = activities.filter((a) => {
      const confirmedCount = a.participants.filter((p: any) => p.status === 'confirmed').length;
      return confirmedCount < a.maxParticipants;
    });

    console.log(`[Feed] mode=${mode}, activities=${activitiesWithSlots.length}/${total}`);
    sendPaginated(res, activitiesWithSlots, total, page, limit);
  } catch (error: any) {
    logger.error('Feed error:', error);
    sendError(res, 'Failed to fetch activity feed', 500);
  }
};

export const searchActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, city, category, dateFrom, dateTo } = req.query;
    const query: Record<string, any> = {
      status: { $in: ['active', 'full'] },
      dateTime: { $gte: new Date() },
    };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (city) query.city = city;
    if (category) query.categories = category;
    if (dateFrom) query.dateTime.$gte = new Date(dateFrom as string);
    if (dateTo) query.dateTime.$lte = new Date(dateTo as string);

    const activities = await Activity.find(query)
      .populate('hostId', 'name profilePhoto trustScore verification.status gender')
      .populate('participants.userId', 'name profilePhoto gender')
      .sort({ dateTime: 1 })
      .limit(50);

    sendSuccess(res, { activities });
  } catch (error: any) {
    sendError(res, 'Search failed', 500);
  }
};

export const getMapActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius, category } = req.query;

    if (!lat || !lng) {
      sendError(res, 'Latitude and longitude are required', 400);
      return;
    }

    const query: Record<string, any> = {
      status: { $in: ['active', 'full'] },
      dateTime: { $gte: new Date() },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: parseInt(radius as string) || 50000,
        },
      },
    };

    if (category) query.categories = category;

    const activities = await Activity.find(query)
      .populate('hostId', 'name profilePhoto trustScore verification.status')
      .limit(100);

    sendSuccess(res, { activities });
  } catch (error: any) {
    sendError(res, 'Map query failed', 500);
  }
};

export const getActivityById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findById(req.params.activityId)
      .populate('hostId', 'name profilePhoto trustScore verification.status gender bio travelStyle interests activitiesHostedCount activitiesJoinedCount')
      .populate('participants.userId', 'name profilePhoto gender verification.status trustScore');

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    // Find current user's participant status
    const userParticipant = activity.participants.find(
      (p) => p.userId && (p.userId._id || p.userId).toString() === req.user!._id.toString()
    );
    const requestStatus = userParticipant?.status || null;
    const isParticipant = requestStatus === 'confirmed';

    sendSuccess(res, { activity, isParticipant, requestStatus });
  } catch (error: any) {
    sendError(res, 'Failed to fetch activity', 500);
  }
};

// ==================== JOIN REQUEST SYSTEM ====================

export const requestJoinActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findById(req.params.activityId);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (activity.status === 'cancelled' || activity.status === 'completed') {
      sendError(res, 'This activity is no longer available', 400);
      return;
    }

    if (activity.hostId.toString() === req.user!._id.toString()) {
      sendError(res, 'You cannot request to join your own activity', 400);
      return;
    }

    const existing = activity.participants.find(
      (p) => p.userId.toString() === req.user!._id.toString()
    );

    if (existing && existing.status === 'confirmed') {
      sendError(res, 'You have already joined this activity', 400);
      return;
    }

    if (existing && existing.status === 'pending') {
      sendError(res, 'You already have a pending request', 400);
      return;
    }

    const confirmedCount = activity.participants.filter((p) => p.status === 'confirmed').length;
    if (confirmedCount >= activity.maxParticipants) {
      sendError(res, 'Activity is full', 400);
      return;
    }

    // If previously rejected/removed/left, reset to pending
    if (existing) {
      existing.status = 'pending';
      existing.requestedAt = new Date();
      existing.joinedAt = undefined;
    } else {
      activity.participants.push({
        userId: req.user!._id,
        requestedAt: new Date(),
        status: 'pending',
      });
    }

    await activity.save();

    // Notify host
    await createNotification({
      userId: activity.hostId.toString(),
      type: 'join_request',
      title: 'New Join Request',
      body: `${req.user!.name} wants to join "${activity.title}"`,
      data: { activityId: activity._id.toString(), userId: req.user!._id.toString() },
    });

    try {
      const io = getIO();
      io.to(`user:${activity.hostId}`).emit('activity:join:request', {
        activityId: activity._id,
        user: {
          id: req.user!._id,
          name: req.user!.name,
          profilePhoto: req.user!.profilePhoto,
          gender: req.user!.gender,
        },
      });
    } catch {}

    sendSuccess(res, { message: 'Join request sent', requestStatus: 'pending' });
  } catch (error: any) {
    logger.error('Request join error:', error);
    sendError(res, 'Failed to send join request', 500);
  }
};

export const withdrawJoinRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findById(req.params.activityId);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    const participantIndex = activity.participants.findIndex(
      (p) => p.userId.toString() === req.user!._id.toString() && p.status === 'pending'
    );

    if (participantIndex === -1) {
      sendError(res, 'No pending request found', 404);
      return;
    }

    activity.participants.splice(participantIndex, 1);
    await activity.save();

    sendSuccess(res, { message: 'Request withdrawn' });
  } catch (error: any) {
    logger.error('Withdraw request error:', error);
    sendError(res, 'Failed to withdraw request', 500);
  }
};

export const approveJoinRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activityId, userId } = req.params;
    const activity = await Activity.findById(activityId);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (activity.hostId.toString() !== req.user!._id.toString()) {
      sendError(res, 'Only the host can approve requests', 403);
      return;
    }

    const participant = activity.participants.find(
      (p) => p.userId.toString() === userId && p.status === 'pending'
    );

    if (!participant) {
      sendError(res, 'No pending request found for this user', 404);
      return;
    }

    const confirmedCount = activity.participants.filter((p) => p.status === 'confirmed').length;
    if (confirmedCount >= activity.maxParticipants) {
      sendError(res, 'Activity is full', 400);
      return;
    }

    participant.status = 'confirmed';
    participant.joinedAt = new Date();

    // Update gender count
    const user = await User.findById(userId);
    if (user) {
      if (user.gender === 'male') activity.genderCount.male++;
      else if (user.gender === 'female') activity.genderCount.female++;
      else activity.genderCount.other++;
    }

    if (confirmedCount + 1 >= activity.maxParticipants) {
      activity.status = 'full';
    }

    await activity.save();

    // Add to chat room
    if (activity.chatRoomId) {
      await ChatRoom.findByIdAndUpdate(activity.chatRoomId, {
        $addToSet: { participants: userId },
      });

      await Message.create({
        chatRoomId: activity.chatRoomId,
        senderId: userId,
        type: 'system',
        text: `${user?.name || 'A user'} joined the activity`,
      });
    }

    await User.findByIdAndUpdate(userId, {
      $inc: { activitiesJoinedCount: 1 },
    });

    await createNotification({
      userId,
      type: 'join_approved',
      title: 'Request Approved!',
      body: `Your request to join "${activity.title}" has been approved`,
      data: { activityId: activity._id.toString() },
    });

    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('activity:join:approved', {
        activityId: activity._id,
      });
      io.to(`activity:${activity._id}`).emit('activity:participant:joined', {
        activityId: activity._id,
        user: {
          id: userId,
          name: user?.name,
          profilePhoto: user?.profilePhoto,
          gender: user?.gender,
        },
        participantCount: confirmedCount + 1,
        genderCount: activity.genderCount,
      });
    } catch {}

    sendSuccess(res, { activity });
  } catch (error: any) {
    logger.error('Approve join error:', error);
    sendError(res, 'Failed to approve request', 500);
  }
};

export const rejectJoinRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activityId, userId } = req.params;
    const activity = await Activity.findById(activityId);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (activity.hostId.toString() !== req.user!._id.toString()) {
      sendError(res, 'Only the host can reject requests', 403);
      return;
    }

    const participant = activity.participants.find(
      (p) => p.userId.toString() === userId && p.status === 'pending'
    );

    if (!participant) {
      sendError(res, 'No pending request found for this user', 404);
      return;
    }

    participant.status = 'rejected';
    await activity.save();

    await createNotification({
      userId,
      type: 'join_rejected',
      title: 'Request Declined',
      body: `Your request to join "${activity.title}" was declined`,
      data: { activityId: activity._id.toString() },
    });

    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('activity:join:rejected', {
        activityId: activity._id,
      });
    } catch {}

    sendSuccess(res, { message: 'Request rejected' });
  } catch (error: any) {
    logger.error('Reject join error:', error);
    sendError(res, 'Failed to reject request', 500);
  }
};

export const removeParticipant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activityId, userId } = req.params;
    const activity = await Activity.findById(activityId);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (activity.hostId.toString() !== req.user!._id.toString()) {
      sendError(res, 'Only the host can remove participants', 403);
      return;
    }

    if (userId === req.user!._id.toString()) {
      sendError(res, 'You cannot remove yourself', 400);
      return;
    }

    // Check 5-hour window
    const fiveHoursBeforeStart = new Date(activity.dateTime.getTime() - 5 * 60 * 60 * 1000);
    if (new Date() > fiveHoursBeforeStart) {
      sendError(res, 'Cannot remove participants within 5 hours of the activity start', 400);
      return;
    }

    const participant = activity.participants.find(
      (p) => p.userId.toString() === userId && p.status === 'confirmed'
    );

    if (!participant) {
      sendError(res, 'User is not a confirmed participant', 404);
      return;
    }

    participant.status = 'removed';

    const user = await User.findById(userId);
    if (user) {
      if (user.gender === 'male') activity.genderCount.male = Math.max(0, activity.genderCount.male - 1);
      else if (user.gender === 'female') activity.genderCount.female = Math.max(0, activity.genderCount.female - 1);
      else activity.genderCount.other = Math.max(0, activity.genderCount.other - 1);
    }

    if (activity.status === 'full') {
      activity.status = 'active';
    }

    await activity.save();

    if (activity.chatRoomId) {
      await ChatRoom.findByIdAndUpdate(activity.chatRoomId, {
        $pull: { participants: userId },
      });

      await Message.create({
        chatRoomId: activity.chatRoomId,
        senderId: req.user!._id,
        type: 'system',
        text: `${user?.name || 'A user'} was removed from the activity`,
      });
    }

    await createNotification({
      userId,
      type: 'member_removed',
      title: 'Removed from Activity',
      body: `You have been removed from "${activity.title}"`,
      data: { activityId: activity._id.toString() },
    });

    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('activity:participant:removed', {
        activityId: activity._id,
      });
      io.to(`activity:${activity._id}`).emit('activity:participant:left', {
        activityId: activity._id,
        userId,
        participantCount: activity.participants.filter((p) => p.status === 'confirmed').length,
      });
    } catch {}

    sendSuccess(res, { message: 'Participant removed' });
  } catch (error: any) {
    logger.error('Remove participant error:', error);
    sendError(res, 'Failed to remove participant', 500);
  }
};

export const getPendingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.activityId,
      hostId: req.user!._id,
    }).populate('participants.userId', 'name profilePhoto gender trustScore verification.status');

    if (!activity) {
      sendError(res, 'Activity not found or not authorized', 404);
      return;
    }

    const pendingRequests = activity.participants.filter((p) => p.status === 'pending');

    sendSuccess(res, { pendingRequests, activityId: activity._id });
  } catch (error: any) {
    logger.error('Get pending requests error:', error);
    sendError(res, 'Failed to fetch pending requests', 500);
  }
};

// ==================== EXISTING ENDPOINTS ====================

export const leaveActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findById(req.params.activityId);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    if (activity.hostId.toString() === req.user!._id.toString()) {
      sendError(res, 'Hosts cannot leave their own activity. Cancel it instead.', 400);
      return;
    }

    const participantIndex = activity.participants.findIndex(
      (p) => p.userId.toString() === req.user!._id.toString() && p.status === 'confirmed'
    );

    if (participantIndex === -1) {
      sendError(res, 'You are not a participant', 400);
      return;
    }

    activity.participants[participantIndex].status = 'left';

    const gender = req.user!.gender;
    if (gender === 'male') activity.genderCount.male = Math.max(0, activity.genderCount.male - 1);
    else if (gender === 'female') activity.genderCount.female = Math.max(0, activity.genderCount.female - 1);
    else activity.genderCount.other = Math.max(0, activity.genderCount.other - 1);

    if (activity.status === 'full') {
      activity.status = 'active';
    }

    await activity.save();

    await ChatRoom.findByIdAndUpdate(activity.chatRoomId, {
      $pull: { participants: req.user!._id },
    });

    await Message.create({
      chatRoomId: activity.chatRoomId,
      senderId: req.user!._id,
      type: 'system',
      text: `${req.user!.name} left the activity`,
    });

    try {
      const io = getIO();
      io.to(`activity:${activity._id}`).emit('activity:participant:left', {
        activityId: activity._id,
        userId: req.user!._id,
        participantCount: activity.participants.filter((p) => p.status === 'confirmed').length,
      });
    } catch {}

    sendSuccess(res, { success: true });
  } catch (error: any) {
    logger.error('Leave activity error:', error);
    sendError(res, 'Failed to leave activity', 500);
  }
};

export const joinWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findById(req.params.activityId);

    if (!activity) {
      sendError(res, 'Activity not found', 404);
      return;
    }

    const alreadyWaitlisted = activity.waitlist.some(
      (w) => w.userId.toString() === req.user!._id.toString()
    );

    if (alreadyWaitlisted) {
      sendError(res, 'Already on waitlist', 400);
      return;
    }

    activity.waitlist.push({ userId: req.user!._id, requestedAt: new Date() });
    await activity.save();

    sendSuccess(res, { position: activity.waitlist.length });
  } catch (error: any) {
    sendError(res, 'Failed to join waitlist', 500);
  }
};

export const updateActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.activityId,
      hostId: req.user!._id,
    });

    if (!activity) {
      sendError(res, 'Activity not found or not authorized', 404);
      return;
    }

    const allowedFields = [
      'title', 'description', 'venueName', 'venueAddress',
      'dateTime', 'maxParticipants', 'categories', 'mood',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (activity as any)[field] = req.body[field];
      }
    }

    await activity.save();
    sendSuccess(res, { activity });
  } catch (error: any) {
    sendError(res, 'Failed to update activity', 500);
  }
};

export const cancelActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.activityId, hostId: req.user!._id },
      { status: 'cancelled' },
      { new: true }
    );

    if (!activity) {
      sendError(res, 'Activity not found or not authorized', 404);
      return;
    }

    await ChatRoom.findByIdAndUpdate(activity.chatRoomId, { isActive: false });

    try {
      const io = getIO();
      io.to(`activity:${activity._id}`).emit('activity:cancelled', {
        activityId: activity._id,
      });
    } catch {}

    sendSuccess(res, { success: true });
  } catch (error: any) {
    sendError(res, 'Failed to cancel activity', 500);
  }
};

export const getMyHosted = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    const query: Record<string, any> = { hostId: req.user!._id };
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      query.status = { $ne: 'cancelled' };
    }

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('hostId', 'name profilePhoto trustScore verification.status')
        .populate('participants.userId', 'name profilePhoto gender')
        .sort({ dateTime: -1 })
        .skip(page * limit)
        .limit(limit),
      Activity.countDocuments(query),
    ]);

    sendPaginated(res, activities, total, page, limit);
  } catch (error: any) {
    sendError(res, 'Failed to fetch hosted activities', 500);
  }
};

export const getMyJoined = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    const query: Record<string, any> = {
      participants: {
        $elemMatch: { userId: req.user!._id, status: 'confirmed' },
      },
      hostId: { $ne: req.user!._id },
    };
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      query.status = { $ne: 'cancelled' };
    }

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('hostId', 'name profilePhoto trustScore verification.status')
        .populate('participants.userId', 'name profilePhoto gender')
        .sort({ dateTime: -1 })
        .skip(page * limit)
        .limit(limit),
      Activity.countDocuments(query),
    ]);

    sendPaginated(res, activities, total, page, limit);
  } catch (error: any) {
    sendError(res, 'Failed to fetch joined activities', 500);
  }
};
