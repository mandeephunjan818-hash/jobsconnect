// modal/BuyerRegistration.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminNote {
  message: string;
  type: 'status_change' | 'general' | 'update_request' | 'update_rejection';
  createdAt: Date;
  createdBy?: string;
}

export interface IBuyerRegistration extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  userId: string;
  status: 'new' | 'reviewed' | 'rejected' | 'approved';
  adminNotes: IAdminNote[];
  updateRequested?: boolean;
  updateRequestData?: any;
  createdAt: Date;
  updatedAt: Date;
  location: {
    address: String;
    lat: Number;
    lng: Number;
  };
  mapsIframe: String;
}

const AdminNoteSchema = new Schema<IAdminNote>({
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['status_change', 'general', 'update_request', 'update_rejection'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String },
});

const BuyerRegistrationSchema = new Schema<IBuyerRegistration>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    country: { type: String, required: true },
    location: {
      address: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    mapsIframe: { type: String, default: '' },
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'rejected', 'approved'],
      default: 'new',
      index: true,
    },
    adminNotes: { type: [AdminNoteSchema], default: [] },
    updateRequested: { type: Boolean, default: false },
    updateRequestData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.BuyerRegistration ||
  mongoose.model<IBuyerRegistration>('BuyerRegistration', BuyerRegistrationSchema);