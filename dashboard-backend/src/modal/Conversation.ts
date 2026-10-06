// models/Conversation.ts
// ─────────────────────────────────────────────────────────────────────────────
// One Conversation = one thread between ONE buyer and ONE seller about ONE listing.
// The admin is a silent mediator: neither party sees the other's raw messages.
//
// Key design: every message carries `visibleTo` so the API can filter server-side.
// Buyers/sellers never receive messages not addressed to them.
// ─────────────────────────────────────────────────────────────────────────────
import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Sub-schema: single message ──────────────────────────────────────────────
export interface IMessage {
  _id?: mongoose.Types.ObjectId;
  content: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  // Who can read this message (filtered at API level — never sent to wrong party)
  visibleTo: 'buyer' | 'seller' | 'both' | 'admin';
  isAdminNote: boolean;   // internal note — never sent to any user
  readByBuyer: boolean;
  readBySeller: boolean;
  readByAdmin: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  content: { type: String, required: true },
  senderRole: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
  visibleTo: { type: String, enum: ['buyer', 'seller', 'both', 'admin'], default: 'admin' },
  isAdminNote: { type: Boolean, default: false },
  readByBuyer: { type: Boolean, default: false },
  readBySeller: { type: Boolean, default: false },
  readByAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// ─── Main Conversation document ───────────────────────────────────────────────
export interface IConversation extends Document {
  // ── Parties ───────────────────────────────────────────────────────────────
  // All IDs are the string userId from session (User._id.toString())
  buyerId: string;
  buyerName: string;
  buyerEmail: string;

  sellerId: string;
  sellerName: string;
  sellerEmail: string;

  // ── Listing reference (always present — one chat per buyer+listing) ───────
  listingId: string;   // Listing._id.toString()
  listingTitle: string;   // Listing.title (denormalised for display, no extra lookup)
  listingSlug: string;   // Listing.slug  (for deep links)

  // ── Optional order reference (can be added later) ─────────────────────────
  orderId?: string;

  // ── Meta ──────────────────────────────────────────────────────────────────
  subject: string;
  category: 'general' | 'order' | 'complaint' | 'technical' | 'billing' | 'other';
  status: 'open' | 'pending_buyer' | 'pending_seller' | 'resolved' | 'closed';

  // ── Thread ────────────────────────────────────────────────────────────────
  messages: IMessage[];

  // ── Unread counters (avoid scanning messages[] on every list load) ─────────
  unreadByBuyer: number;
  unreadBySeller: number;
  unreadByAdmin: number;

  // ── Timestamps ────────────────────────────────────────────────────────────
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IConversationModel extends Model<IConversation> {
  getTotalUnreadForAdmin(): Promise<{ _id: null; total: number }[]>;
}

const ConversationSchema = new Schema<IConversation, IConversationModel>({
  buyerId: { type: String, required: true, index: true },
  buyerName: { type: String, required: true },
  buyerEmail: { type: String, required: true, lowercase: true, trim: true },

  sellerId: { type: String, required: true, index: true },
  sellerName: { type: String, required: true },
  sellerEmail: { type: String, required: true, lowercase: true, trim: true },

  listingId: { type: String, required: true, index: true },
  listingTitle: { type: String, required: true },
  listingSlug: { type: String, required: true },

  orderId: { type: String, default: null },

  subject: { type: String, required: true },
  category: {
    type: String,
    enum: ['general', 'order', 'complaint', 'technical', 'billing', 'other'],
    default: 'general',
  },
  status: {
    type: String,
    enum: ['open', 'pending_buyer', 'pending_seller', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },

  messages: { type: [MessageSchema], default: [] },

  unreadByBuyer: { type: Number, default: 0 },
  unreadBySeller: { type: Number, default: 0 },
  unreadByAdmin: { type: Number, default: 0 },

  lastActivityAt: { type: Date, default: Date.now },
},
  { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Prevents a buyer opening duplicate threads on the same listing
ConversationSchema.index({ buyerId: 1, listingId: 1 }, { unique: true });
ConversationSchema.index({ sellerId: 1, status: 1 });
ConversationSchema.index({ lastActivityAt: -1 });

// ─── Statics ──────────────────────────────────────────────────────────────────
ConversationSchema.statics.getTotalUnreadForAdmin = function () {
  return this.aggregate([
    { $group: { _id: null, total: { $sum: '$unreadByAdmin' } } },
  ]);
};

const Conversation = (mongoose.models.Conversation as IConversationModel) ||
  mongoose.model<IConversation, IConversationModel>('Conversation', ConversationSchema);

export default Conversation;