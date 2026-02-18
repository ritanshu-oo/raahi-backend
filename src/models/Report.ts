import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  activityId?: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  screenshots: string[];
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    reason: {
      type: String,
      enum: ['harassment', 'inappropriate', 'fake-profile', 'no-show', 'safety-concern', 'spam', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    screenshots: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

ReportSchema.index({ reportedUserId: 1 });
ReportSchema.index({ status: 1 });

export default mongoose.model<IReport>('Report', ReportSchema);
