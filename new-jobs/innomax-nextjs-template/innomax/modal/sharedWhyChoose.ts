/**
 * sharedWhyChoose.ts
 *
 * Single source of truth for all sub-schemas shared between
 * WhyChooseUs and WhyChooseUsDraft.
 *
 * ⚠️  This file must NEVER import from WhyChooseUs.ts or WhyChooseUsDraft.ts.
 *     Both of those models import from here — importing back would
 *     create a circular dependency.
 */

import { Schema } from 'mongoose';
import { KNOWN_SITES, SiteSlug } from './sharedListing';

export { KNOWN_SITES };
export type { SiteSlug };

// ─────────────────────────────────────────────────────────────
// Skill bar  (e.g. Headhunting → 85%)
// ─────────────────────────────────────────────────────────────
export interface ISkillBar {
    label: string;       // e.g. "Headhunting"
    percentage: number;  // 1–100
    order: number;       // display order
}

export const SkillBarSchema = new Schema<ISkillBar>(
    {
        label: { type: String, required: true },
        percentage: { type: Number, required: true, min: 1, max: 100 },
        order: { type: Number, required: true, default: 0 },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Video block  (YouTube embed + thumbnail)
// ─────────────────────────────────────────────────────────────
export interface IVideoBlock {
    youtubeId: string;       // e.g. "Q5PG0rMXgvw"
    thumbnailUrl: string;    // uploaded/CDN image URL
    playButtonImageUrl: string; // uploaded/CDN play-button SVG/PNG URL
}

export const VideoBlockSchema = new Schema<IVideoBlock>(
    {
        youtubeId: { type: String, required: true },
        thumbnailUrl: { type: String, required: true },
        playButtonImageUrl: { type: String, required: true },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Section text  (the headline block)
// ─────────────────────────────────────────────────────────────
export interface ISectionText {
    tagline: string;     // maps to <h6> e.g. "[What We Deliver]"
    title: string;       // maps to <h2>
    paragraph: string;   // maps to <p>
}

export const SectionTextSchema = new Schema<ISectionText>(
    {
        tagline: { type: String, required: true },
        title: { type: String, required: true },
        paragraph: { type: String, required: true },
    },
    { _id: false },
);

// ─────────────────────────────────────────────────────────────
// Admin note  (re-declared here to keep this file self-contained
// — or you can re-export from sharedListing if preferred)
// ─────────────────────────────────────────────────────────────
export interface IWhyChooseAdminNote {
    message: string;
    type: 'status_change' | 'general';
    createdAt: Date;
    createdBy?: string;
}

export const WhyChooseAdminNoteSchema = new Schema<IWhyChooseAdminNote>(
    {
        message: { type: String, required: true },
        type: { type: String, enum: ['status_change', 'general'], required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: String },
    },
    { _id: false },
);