import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  name: string;
  displayName: string;
  description?: string;
  icon: string;
  criteria: {
    type: string;
    threshold: number;
  };
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

const BadgeSchema = new Schema<IBadge>({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  criteria: {
    type: {
      type: String,
      enum: ['activities_hosted', 'activities_joined', 'ratings_count', 'trust_score', 'cities_visited', 'special'],
    },
    threshold: { type: Number },
  },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'] },
});

export default mongoose.model<IBadge>('Badge', BadgeSchema);
