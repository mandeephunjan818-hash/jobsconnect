// src/modal/Service.ts
import mongoose, { Schema, Document } from 'mongoose';

export type ServiceStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface ServiceItem {
    id: string;
    number: string;
    title: string;
    description: string;
    imageUrl: string;
    shapeImageUrl: string;
    link: string;
    order: number;
    status: 'draft' | 'scheduled' | 'published' | 'archived';
    isActive: boolean;
    publishAt: string | null;
    adminNotes: { message: string; type: string; createdAt: string; createdBy?: string }[];
    createdAt: string;
    updatedAt: string;
}

export function toServiceItem(doc: any): ServiceItem {
    return {
        id: doc._id.toString(),
        number: doc.number,
        title: doc.title,
        description: doc.description,
        imageUrl: doc.imageUrl,
        shapeImageUrl: doc.shapeImageUrl,
        link: doc.link,
        order: doc.order,
        status: doc.status ?? 'draft',
        isActive: doc.isActive ?? false,
        publishAt: doc.publishAt ? new Date(doc.publishAt).toISOString() : null,
        adminNotes: doc.adminNotes ?? [],
        createdAt: doc.createdAt?.toISOString?.() ?? '',
        updatedAt: doc.updatedAt?.toISOString?.() ?? '',
    };
}

export interface ServicesApiResponse {
    data: ServiceItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

export interface IAdminNote {
    message: string;
    type: 'status_change' | 'general';
    createdAt: Date;
    createdBy?: string;
}

export interface IService extends Document {
    number: string;
    title: string;
    description: string;
    imageUrl: string;
    shapeImageUrl: string;
    link: string;
    order: number;
    status: ServiceStatus;
    isActive: boolean;
    publishAt?: Date;
    adminNotes: IAdminNote[];
    createdAt: Date;
    updatedAt: Date;
}

const AdminNoteSchema = new Schema<IAdminNote>(
    {
        message: { type: String, required: true },
        type: { type: String, enum: ['status_change', 'general'], required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: String },
    },
    { _id: false }
);

const ServiceSchema = new Schema<IService>(
    {
        number: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        imageUrl: { type: String, required: true },
        shapeImageUrl: { type: String, required: true },
        link: { type: String, required: true },
        order: { type: Number, required: true, index: true },
        status: {
            type: String,
            enum: ['draft', 'scheduled', 'published', 'archived'],
            default: 'draft',
            index: true,
        },
        isActive: { type: Boolean, default: false, index: true },
        publishAt: { type: Date },
        adminNotes: { type: [AdminNoteSchema], default: [] },
    },
    { timestamps: true }
);

export default mongoose.models.Service ||
    mongoose.model<IService>('Service', ServiceSchema);