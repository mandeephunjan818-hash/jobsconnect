// modal/ContactMessage.ts
import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES, SiteId } from '@/lib/sites'; // move KNOWN_SITES here ideally

export interface IReply {
  message: string;
  createdAt: Date;
}

export interface IContactMessage extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  site: SiteId;
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['unread', 'read', 'replied'], default: 'unread' },
    site: { type: String, enum: KNOWN_SITES, required: true },  // ← new
    replies: { type: [ReplySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.ContactMessage ||
  mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);