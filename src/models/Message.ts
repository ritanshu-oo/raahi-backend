import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatRoomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  type: 'text' | 'image' | 'system' | 'icebreaker';
  text: string;
  imageUrl?: string;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatRoomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'system', 'icebreaker'], default: 'text' },
    text: { type: String, required: true },
    imageUrl: { type: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

MessageSchema.index({ chatRoomId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
