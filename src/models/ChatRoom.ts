import mongoose, { Schema, Document } from 'mongoose';

export interface IChatRoom extends Document {
  activityId?: mongoose.Types.ObjectId;
  type: 'group' | 'dm';
  participants: mongoose.Types.ObjectId[];
  dmParticipants?: mongoose.Types.ObjectId[];
  relatedActivityId?: mongoose.Types.ObjectId;
  lastMessage?: {
    text: string;
    senderId: mongoose.Types.ObjectId;
    sentAt: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema = new Schema<IChatRoom>(
  {
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    type: { type: String, enum: ['group', 'dm'], default: 'group' },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dmParticipants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    relatedActivityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    lastMessage: {
      text: { type: String },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      sentAt: { type: Date },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ChatRoomSchema.index({ participants: 1 });
ChatRoomSchema.index({ activityId: 1 });
ChatRoomSchema.index({ type: 1, dmParticipants: 1 });

export default mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);
