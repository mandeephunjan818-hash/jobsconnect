import mongoose, { Schema, Document } from 'mongoose';
import { KNOWN_SITES, SiteId } from '../lib/sites';

export interface IJobApplication extends Document {
    name: string;
    email: string;
    siteId: SiteId;
    jobId?: string;
    status: 'pending' | 'reviewed' | 'contacted' | 'rejected';
    appliedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        siteId: {
            type: String,
            required: true,
            enum: KNOWN_SITES,
        },
        jobId: { type: String, default: undefined },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'contacted', 'rejected'],
            default: 'pending',
        },
        appliedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.models.JobApplication ||
    mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);