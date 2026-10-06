import mongoose, { Schema, Document } from 'mongoose';

// Interface for an individual admin note
export interface IAdminNote {
  message: string;
  type: 'status_change' | 'update_request' | 'update_rejection' | 'general';
  createdAt: Date;
  createdBy?: string;
}

export interface IBusinessRegistration extends Document {
  userId: string;
  businessName: string;
  businessType: string;
  location: string; // keep as plain text (city/region label)
  businessLocation: {  // ← NEW: structured picker data
    address: string;
    lat: number;
    lng: number;
  };
  mapsIframe: string;
  years: number;
  contactNumber: string;
  revenue: string;
  ebitda: string;
  overview: string;
  firstName: string;
  lastName: string;
  email: string;
  sellerContactNumber: string;
  ownerOrBroker: string;
  confirmed: boolean;
  selfieUrl: string;
  country: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  adminNotes: IAdminNote[];
  updateRequested?: boolean;
  updateRequestData?: any; // requested changes as object
  updateRequestRejectionNotes?: string; // optional, for backward compatibility
  createdAt: Date;
  updatedAt: Date;
}

const AdminNoteSchema = new Schema<IAdminNote>({
  message: { type: String, required: true },
  type: { type: String, enum: ['status_change', 'update_request', 'update_rejection', 'general'], required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String },
});

const BusinessRegistrationSchema = new Schema<IBusinessRegistration>(
  {
    userId: { type: String, required: true, index: true, unique: true },
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    location: { type: String, required: true },
    businessLocation: {
      address: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    mapsIframe: { type: String, default: '' },
    years: { type: Number, required: true },
    contactNumber: { type: String, required: true },
    revenue: { type: String, required: true },
    ebitda: { type: String, required: true },
    overview: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    sellerContactNumber: { type: String, required: true },
    ownerOrBroker: { type: String, required: true },
    confirmed: { type: Boolean, required: true, default: false },
    selfieUrl: { type: String, required: true },
    country: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    adminNotes: { type: [AdminNoteSchema], default: [] },
    updateRequested: { type: Boolean, default: false },
    updateRequestData: { type: Schema.Types.Mixed },
    updateRequestRejectionNotes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.BusinessRegistration ||
  mongoose.model<IBusinessRegistration>('BusinessRegistration', BusinessRegistrationSchema);