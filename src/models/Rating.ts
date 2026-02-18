import mongoose, { Schema, Document } from 'mongoose';

export interface IRating extends Document {
  activityId: mongoose.Types.ObjectId;
  raterId: mongoose.Types.ObjectId;
  rateeId: mongoose.Types.ObjectId;
  score: number;
  tags: string[];
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
    raterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rateeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    tags: [{ type: String }],
    comment: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

RatingSchema.index({ rateeId: 1, createdAt: -1 });
RatingSchema.index({ activityId: 1, raterId: 1, rateeId: 1 }, { unique: true });

export default mongoose.model<IRating>('Rating', RatingSchema);
