import mongoose, { Schema, Document } from 'mongoose';

export interface IAgreement extends Document {
  BusinessRegistrationId: {
    type: Schema.Types.ObjectId;
    required: true;
    refPath: string;
  };
  title: string;
  content: string;
  version: string;
  status: 'draft' | 'signed' | 'expired';
  effectiveDate: Date;
  // New fields for acceptance link
  acceptanceToken?: string;
  tokenExpiry?: Date;
  acceptedAt?: Date;
  signedByEmail?: string;   // client email who signed
  signatureIp?: string;
  createdAt: Date;
  updatedAt: Date;
  onModel: {
    type: String;
    enum: 'BusinessRegistration' | 'BuyerRegistration';
  };
}

const AgreementSchema = new Schema<IAgreement>(
  {
    BusinessRegistrationId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'onModel',
      index: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    version: { type: String, default: '1.0' },
    status: {
      type: String,
      enum: ['draft', 'signed', 'expired'],
      default: 'draft',
    },
    onModel: {
      type: String,
      required: true,
      enum: ['BusinessRegistration', 'BuyerRegistration']
    },
    effectiveDate: { type: Date, default: Date.now },
    acceptanceToken: { type: String, unique: true, sparse: true },
    tokenExpiry: { type: Date },
    acceptedAt: { type: Date },
    signedByEmail: { type: String },
    signatureIp: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Agreement ||
  mongoose.model<IAgreement>('Agreement', AgreementSchema);