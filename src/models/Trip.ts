import mongoose, { Schema, Document } from 'mongoose';

export interface ITrip extends Document {
  userId: mongoose.Types.ObjectId;
  city: string;
  state?: string;
  country: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  startDate: Date;
  endDate: Date;
  mood: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    city: { type: String, required: true, index: true },
    state: { type: String },
    country: { type: String, default: 'India' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    mood: {
      type: String,
      enum: ['adventure', 'chill', 'party', 'cultural', 'foodie', 'spiritual', 'workation'],
      required: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

TripSchema.index({ userId: 1, status: 1 });
TripSchema.index({ city: 1, startDate: 1, endDate: 1, status: 1 });
TripSchema.index({ location: '2dsphere' });

export default mongoose.model<ITrip>('Trip', TripSchema);
