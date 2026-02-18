import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant {
  userId: mongoose.Types.ObjectId;
  joinedAt?: Date;
  requestedAt?: Date;
  status: 'pending' | 'confirmed' | 'rejected' | 'removed' | 'left';
}

export interface IActivity extends Document {
  hostId: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  emoji?: string;
  coverImage?: string;
  categories: string[];
  city: string;
  venueName?: string;
  venueAddress?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  dateTime: Date;
  duration?: number;
  maxParticipants: number;
  participants: IParticipant[];
  waitlist: Array<{
    userId: mongoose.Types.ObjectId;
    requestedAt: Date;
  }>;
  genderCount: {
    male: number;
    female: number;
    other: number;
  };
  mood?: string;
  status: 'draft' | 'active' | 'full' | 'completed' | 'cancelled';
  chatRoomId?: mongoose.Types.ObjectId;
  ratingsCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    emoji: { type: String },
    coverImage: { type: String },
    categories: [{ type: String }],
    city: { type: String, required: true, index: true },
    venueName: { type: String },
    venueAddress: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    dateTime: { type: Date, required: true, index: true },
    duration: { type: Number },
    maxParticipants: { type: Number, required: true, min: 2, max: 20 },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date },
        requestedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['pending', 'confirmed', 'rejected', 'removed', 'left'],
          default: 'pending',
        },
      },
    ],
    waitlist: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    genderCount: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    mood: { type: String },
    status: {
      type: String,
      enum: ['draft', 'active', 'full', 'completed', 'cancelled'],
      default: 'active',
    },
    chatRoomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom' },
    ratingsCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ActivitySchema.index({ city: 1, dateTime: 1, status: 1 });
ActivitySchema.index({ location: '2dsphere' });
ActivitySchema.index({ categories: 1 });
ActivitySchema.index({ 'participants.userId': 1 });
ActivitySchema.index({ hostId: 1, status: 1 });
ActivitySchema.index({ hostId: 1, 'participants.status': 1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
