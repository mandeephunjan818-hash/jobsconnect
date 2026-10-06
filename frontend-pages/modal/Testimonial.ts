// models/Testimonial.ts
import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES } from '../lib/sites';

export interface ITestimonial extends Document {
  name: string;
  role: string;
  text: string;
  rating: number;
  imageUrl?: string;
  order: number;
  sites: string[];                     // ✅ array of site IDs
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    text: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    imageUrl: { type: String },
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
  { timestamps: true }
);

// Remove the old compound index (if exists). Keep simple order index.
// TestimonialSchema.index({ siteId: 1, order: 1 });   // REMOVED
TestimonialSchema.index({ order: 1 });

export default mongoose.models.Testimonial || mongoose.model<ITestimonial>('Testimonial', TestimonialSchema);