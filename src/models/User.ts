import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  phone?: string;
  email?: string;
  authProvider: 'phone' | 'google';
  name: string;
  profilePhoto?: string;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  languages: string[];
  travelStyle?: string;
  interests: string[];
  bio?: string;
  verification: {
    status: 'none' | 'pending' | 'verified' | 'rejected';
    governmentIdUrl?: string;
    selfieUrl?: string;
    submittedAt?: Date;
    verifiedAt?: Date;
  };
  trustScore: number;
  totalRatingsReceived: number;
  totalRatingsSum: number;
  activitiesHostedCount: number;
  activitiesJoinedCount: number;
  badges: mongoose.Types.ObjectId[];
  expoPushToken?: string;
  lastKnownLocation?: {
    type: string;
    coordinates: number[];
  };
  profileSetupStep: number;
  isProfileComplete: boolean;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relation: string;
  }>;
  settings: {
    notificationsEnabled: boolean;
    locationSharingEnabled: boolean;
    showGenderOnProfile: boolean;
    showTrustScore: boolean;
  };
  isActive: boolean;
  isBanned: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    phone: { type: String, sparse: true, unique: true },
    email: { type: String, sparse: true },
    authProvider: { type: String, enum: ['phone', 'google'], required: true },

    name: { type: String, required: true, maxlength: 50 },
    profilePhoto: { type: String },
    gender: { type: String, enum: ['male', 'female', 'non-binary', 'prefer-not-to-say'] },
    languages: [{ type: String }],
    travelStyle: { type: String, enum: ['backpacker', 'explorer', 'luxury', 'digital-nomad'] },
    interests: [{ type: String }],
    bio: { type: String, maxlength: 300 },

    verification: {
      status: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
      governmentIdUrl: { type: String },
      selfieUrl: { type: String },
      submittedAt: { type: Date },
      verifiedAt: { type: Date },
    },

    trustScore: { type: Number, default: 0, min: 0, max: 5 },
    totalRatingsReceived: { type: Number, default: 0 },
    totalRatingsSum: { type: Number, default: 0 },
    activitiesHostedCount: { type: Number, default: 0 },
    activitiesJoinedCount: { type: Number, default: 0 },
    badges: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],

    expoPushToken: { type: String },
    lastKnownLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },

    profileSetupStep: { type: Number, default: 0, min: 0, max: 4 },
    isProfileComplete: { type: Boolean, default: false },

    emergencyContacts: [
      {
        name: { type: String },
        phone: { type: String },
        relation: { type: String },
      },
    ],

    settings: {
      notificationsEnabled: { type: Boolean, default: true },
      locationSharingEnabled: { type: Boolean, default: true },
      showGenderOnProfile: { type: Boolean, default: true },
      showTrustScore: { type: Boolean, default: true },
    },

    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ 'lastKnownLocation': '2dsphere' }, { sparse: true });

export default mongoose.model<IUser>('User', UserSchema);
