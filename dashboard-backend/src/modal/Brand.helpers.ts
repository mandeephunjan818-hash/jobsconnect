/**
 * Brand.helpers.ts
 *
 * Serialisation helper + API response types for the Brand model.
 * Mirrors the pattern of toWhyChooseItem / WhyChooseApiResponse.
 */

export interface BrandItem {
    id: string;
    name: string;
    companyType: string;
    description: string;
    address: {
        street?: string;
        city?: string;
        province?: string;
        country?: string;
        postalCode?: string;
    };
    logoUrl: string;
    logoAlt: string;
    websiteUrl?: string;
    order: number;
    visibleOnSites: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export function toBrandItem(doc: any): BrandItem {
    return {
        id: doc._id?.toString() ?? doc.id,
        name: doc.name,
        companyType: doc.companyType,
        description: doc.description,
        address: {
            street: doc.address?.street,
            city: doc.address?.city,
            province: doc.address?.province,
            country: doc.address?.country,
            postalCode: doc.address?.postalCode,
        },
        logoUrl: doc.logoUrl,
        logoAlt: doc.logoAlt ?? doc.name,
        websiteUrl: doc.websiteUrl,
        order: doc.order ?? 0,
        visibleOnSites: doc.visibleOnSites ?? [],
        isActive: doc.isActive ?? true,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    };
}

export interface BrandApiResponse {
    data: BrandItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}