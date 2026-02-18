import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Report from '../models/Report';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const submitReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportedUserId, activityId, reason, description } = req.body;

    if (!reportedUserId || !reason) {
      sendError(res, 'reportedUserId and reason are required', 400);
      return;
    }

    const report = await Report.create({
      reporterId: req.user!._id,
      reportedUserId,
      activityId,
      reason,
      description,
    });

    logger.info(`Report submitted: ${report._id} by ${req.user!._id} against ${reportedUserId}`);

    sendSuccess(res, { report, referenceId: `R-${report._id.toString().slice(-4).toUpperCase()}` }, 201);
  } catch (error: any) {
    logger.error('Report submission error:', error);
    sendError(res, 'Failed to submit report', 500);
  }
};
