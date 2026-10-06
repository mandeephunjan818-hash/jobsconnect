import mongoose, { Schema, Document } from 'mongoose';

export interface IAboutStory extends Document {
  pageIdentifier: string;       // e.g., "home-one", "about-page"
  heading: string;
  description: string;
  listItems: string[];
  buttonText: string;
  buttonLink: string;
  mainImage: string;
  sideImages: string[];          // array of two image URLs
  stats: Array<{
    number: number;
    suffix?: string;             // e.g., "+"
    text: string;
  }>;
}

const AboutStorySchema = new Schema<IAboutStory>(
  {
    pageIdentifier: { type: String, required: true, unique: true },
    heading: { type: String, required: true },
    description: { type: String, required: true },
    listItems: [{ type: String, required: true }],
    buttonText: { type: String, required: true },
    buttonLink: { type: String, required: true },
    mainImage: { type: String, required: true },
    sideImages: [{ type: String, required: true }],
    stats: [
      {
        number: { type: Number, required: true },
        suffix: { type: String, default: '+' },
        text: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AboutStory || mongoose.model<IAboutStory>('AboutStory', AboutStorySchema);   