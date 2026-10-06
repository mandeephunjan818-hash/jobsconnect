import mongoose, { Schema, Document } from 'mongoose';

export interface IBlogComment extends Document {
    blogSlug: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    isApproved: boolean;
    parentId?: mongoose.Types.ObjectId;
}

const BlogCommentSchema = new Schema<IBlogComment>(
    {
        blogSlug: { type: String, required: true, index: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String },
        message: { type: String, required: true },
        isApproved: { type: Boolean, default: false },
        parentId: { type: Schema.Types.ObjectId, ref: 'BlogComment', default: null },
    },
    { timestamps: true }
);

export default mongoose.models.BlogComment ||
    mongoose.model<IBlogComment>('BlogComment', BlogCommentSchema);