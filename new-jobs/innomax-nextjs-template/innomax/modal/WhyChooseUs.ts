/**
 * WhyChooseUs.ts  (live / approved documents)
 *
 * Rules:
 *   ✅  import FROM sharedWhyChoose
 *   ❌  never import from WhyChooseUsDraft  (circular dep)
 *
 * Constraint enforced via pre-save hook:
 *   Only ONE document may have  isActive: true  per site slug at a time.
 *   Saving a new active doc for a site automatically deactivates the
 *   previous one — same pattern used by a CMS "publish" action.
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
    ISkillBar,
    IVideoBlock,
    ISectionText,
    IWhyChooseAdminNote,
    SkillBarSchema,
    VideoBlockSchema,
    SectionTextSchema,
    WhyChooseAdminNoteSchema,
    KNOWN_SITES,
} from './sharedWhyChoose';

export type {
    ISkillBar,
    IVideoBlock,
    ISectionText,
    IWhyChooseAdminNote,
};

// ─────────────────────────────────────────────────────────────
// Document interface
// ─────────────────────────────────────────────────────────────
export interface IWhyChooseUs extends Document {
    // ── Which site this document belongs to ───────────────────
    /**
     * One of the KNOWN_SITES slugs (e.g. "new-jobs-fawn.vercel.app").
     * Only one document per site can have isActive: true.
     */
    site: string;

    // ── Content ───────────────────────────────────────────────
    sectionText: ISectionText;
    skillBars: ISkillBar[];
    video: IVideoBlock;

    // ── Workflow ──────────────────────────────────────────────
    status: 'pending' | 'scheduled' | 'approved' | 'rejected';
    isActive: boolean;

    // ── Ownership ─────────────────────────────────────────────
    submittedBy: string;

    // ── Admin history ─────────────────────────────────────────
    adminNotes: IWhyChooseAdminNote[];

    // ── Update request flow ───────────────────────────────────
    updateRequested: boolean;
    updateRequestData?: any;

    // ── Timestamps ────────────────────────────────────────────
    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────
const WhyChooseUsSchema = new Schema<IWhyChooseUs>(
    {
        // ── Site ────────────────────────────────────────────────
        site: {
            type: String,
            required: true,
            enum: KNOWN_SITES,
            index: true,
        },

        // ── Content ─────────────────────────────────────────────
        sectionText: { type: SectionTextSchema, required: true },
        skillBars: { type: [SkillBarSchema], default: [] },
        video: { type: VideoBlockSchema, required: true },

        // ── Workflow ────────────────────────────────────────────
        status: {
            type: String,
            enum: ['pending', 'scheduled', 'approved', 'rejected'],
            required: true,
            default: 'pending',
            index: true,
        },
        isActive: { type: Boolean, default: false, index: true },

        // ── Ownership ───────────────────────────────────────────
        submittedBy: { type: String, required: true, index: true },

        // ── Admin ───────────────────────────────────────────────
        adminNotes: { type: [WhyChooseAdminNoteSchema], default: [] },
        updateRequested: { type: Boolean, default: false },
        updateRequestData: { type: Schema.Types.Mixed },
    },
    { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// Compound index — enforces the "one active doc per site" rule
// at the DB level (sparse so non-active docs are excluded).
// ─────────────────────────────────────────────────────────────
WhyChooseUsSchema.index(
    { site: 1, isActive: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
        name: 'unique_active_per_site',
    },
);

// ─────────────────────────────────────────────────────────────
// Pre-save hook
// When a document is being set to  isActive: true,
// deactivate any other active document for the same site first.
// This keeps the application-level guarantee even if the DB
// partial index is bypassed (e.g. bulk writes).
// ─────────────────────────────────────────────────────────────
WhyChooseUsSchema.pre('save', async function () {
    if (this.isActive && this.isModified('isActive')) {
        await (this.constructor as any).updateMany(
            {
                site: this.site,
                isActive: true,
                _id: { $ne: this._id }, // exclude self
            },
            { $set: { isActive: false } },
        );
    }
});

export default mongoose.models.WhyChooseUs ||
    mongoose.model<IWhyChooseUs>('WhyChooseUs', WhyChooseUsSchema);