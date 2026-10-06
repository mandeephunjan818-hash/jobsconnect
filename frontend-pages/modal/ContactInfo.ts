import mongoose, { Schema, Document } from 'mongoose';

export interface IContactInfo extends Document {
  phone: string;
  addressLine1: string;
  addressLine2: string;
  emails: string[];        // e.g., ["info@startix.com", "care@startix.com"]
  socialLinks: {
    platform: string;      // 'facebook', 'twitter', etc.
    url: string;
    iconClass: string;     // e.g., 'ti ti-brand-facebook'
  }[];
  // If you want to allow multiple contact info versions, you can add an identifier field, but for now we'll assume one document.
}

const ContactInfoSchema = new Schema<IContactInfo>(
  {
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, required: true },
    emails: [{ type: String, required: true }],
    socialLinks: [{
      platform: { type: String, required: true },
      url: { type: String, required: true },
      iconClass: { type: String, required: true },
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ContactInfo || mongoose.model<IContactInfo>('ContactInfo', ContactInfoSchema);