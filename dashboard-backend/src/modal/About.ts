import mongoose, { Schema, Document } from 'mongoose';

export interface IAbout extends Document {
  pageIdentifier: string;   // e.g., "home-two"
  imageUrl: string;
  subtitle: string;
  title: string;
  paragraphs: string[];     // array of paragraph texts
  listItems: string[];      // array of bullet point texts
  buttonText: string;
  buttonLink: string;
  order?: number;           // optional sorting
}

const AboutSchema = new Schema<IAbout>(
  {
    pageIdentifier: { type: String, required: true, unique: true },
    imageUrl: { type: String, required: true },
    subtitle: { type: String, required: true },
    title: { type: String, required: true },
    paragraphs: { type: [String], required: true },
    listItems: { type: [String], required: true },
    buttonText: { type: String, required: true },
    buttonLink: { type: String, required: true },
    order: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.models.About || mongoose.model<IAbout>('About', AboutSchema);