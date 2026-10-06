import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES } from '@/lib/sites';

export interface IFaq extends Document {
  question: string;
  answer: string;
  order: number;
  sites: string[];                 // ✅ new
}

const FaqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    order: { type: Number, required: true, index: true },
    sites: {
      type: [String],
      required: true,
      default: ['*'],
      validate: {
        validator: (v: string[]) =>
          v.every(s => s === '*' || (KNOWN_SITES as readonly string[]).includes(s)),
        message: 'Invalid siteId(s) in sites array',
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Faq || mongoose.model<IFaq>('Faq', FaqSchema);