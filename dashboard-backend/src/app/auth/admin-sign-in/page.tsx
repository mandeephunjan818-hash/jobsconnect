import AdminSignIn from "@/components/Auth/AdminSignIn";
import type { Metadata } from "next";
import { fetchPageMetadata } from '@/lib/fetchPageMetadata';
import "../../../../public/assets/scss/_auth.scss";   // same styles as sign‑in
import getLocalImageUrl from '@/utils/ChangeImageUrl';
import { getSiteConfig } from "@/app/actions/siteConfigAction";

export async function generateMetadata(): Promise<Metadata> {
    const meta = await fetchPageMetadata('/auth/admin-sign-in');
    if (!meta) {
        return { title: 'Admin Login | JobsConnect' };
    }

    // Static fallback for canonical & social URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pagePath = '/auth/admin-sign-in';
    const canonical = meta.canonicalUrl || `${baseUrl}${pagePath}`;

    return {
        title: meta.title || 'Admin Login | JobsConnect',
        description: meta.description || undefined,
        keywords: meta.keywords || undefined,
        robots: meta.robots || undefined,
        alternates: {
            canonical,                                // always present
        },
        icons: meta.logo
            ? {
                icon: meta.logo,
                apple: meta.logo,
            }
            : undefined,
        openGraph: {
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            url: canonical,                           // always set
            type: 'website',
            images: getLocalImageUrl(meta.ogImage)
                ? [{
                    url: getLocalImageUrl(meta.ogImage),
                    alt: meta.ogImageAlt || meta.title,
                }]
                : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            // url: canonical,                           // always set
            images: getLocalImageUrl(meta.ogImage)
                ? [{
                    url: getLocalImageUrl(meta.ogImage),
                    alt: meta.ogImageAlt || meta.title,
                }]
                : undefined,
        },
    };
}

export default async function Page() {
    let logoUrl: string | undefined;
    let logoAlt: string | undefined;
    try {
        const config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
        if (config) { logoUrl = config.logoUrl; logoAlt = config.logoAlt; }
    } catch { }
    return <AdminSignIn logoUrl={(logoUrl ? logoUrl : "/") || "/"} logoAlt={(logoAlt ? logoAlt : "/") || "/"} />;
}