/**
 * WhyChooseUs.helpers.ts
 *
 * Serialisation helper + API response types.
 * Add these exports to the bottom of WhyChooseUs.ts,
 * or keep as a separate file and import where needed.
 *
 * Mirrors the pattern of toServiceItem / ServicesApiResponse in Service.ts.
 */

export interface WhyChooseItem {
    id: string;
    site: string;
    tagline: string;
    title: string;
    paragraph: string;
    skillBars: Array<{ label: string; percentage: number; order: number }>;
    youtubeId: string;
    thumbnailUrl: string;
    playButtonImageUrl: string;
    status: string;
    isActive: boolean;
    submittedBy: string;
    adminNotes: Array<{ message: string; type: string; createdAt: string; createdBy?: string }>;
    updateRequested: boolean;
    createdAt: string;
    updatedAt: string;
}

export function toWhyChooseItem(doc: any): WhyChooseItem {
    return {
        id: doc._id?.toString() ?? doc.id,
        site: doc.site,
        tagline: doc.sectionText?.tagline ?? '',
        title: doc.sectionText?.title ?? '',
        paragraph: doc.sectionText?.paragraph ?? '',
        skillBars: (doc.skillBars ?? []).map((s: any) => ({
            label: s.label,
            percentage: s.percentage,
            order: s.order,
        })),
        youtubeId: doc.video?.youtubeId ?? '',
        thumbnailUrl: doc.video?.thumbnailUrl ?? '',
        playButtonImageUrl: doc.video?.playButtonImageUrl ?? '',
        status: doc.status,
        isActive: doc.isActive,
        submittedBy: doc.submittedBy,
        adminNotes: (doc.adminNotes ?? []).map((n: any) => ({
            message: n.message,
            type: n.type,
            createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
            createdBy: n.createdBy,
        })),
        updateRequested: doc.updateRequested ?? false,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    };
}

export interface WhyChooseApiResponse {
    data: WhyChooseItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}