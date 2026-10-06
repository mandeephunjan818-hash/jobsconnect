// src/app/(jobs)/jobs/page.tsx
import type { Metadata } from 'next';
import { fetchPageMetadata } from '../../../../lib/fetchPageMetadata';
import Breadcrumb from '@/common/Breadcrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import Wrapper from '@/layouts/Wrapper';
// import CtaHomeTwo from '@/components/homes/home-2/CtaHomeTwo';
import FooterOne from '@/layouts/footers/FooterOne';
import JobsArea from '@/components/jobs/JobsAres';

export async function generateMetadata(): Promise<Metadata> {
    const meta = await fetchPageMetadata('/jobs');

    // Static base URL from environment (build‑time, no request headers)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pagePath = '/jobs';
    const canonical = meta?.canonicalUrl || `${baseUrl.replace(/\/$/, '')}${pagePath}`;

    if (!meta) {
        return {
            title: 'Job Listings | Find Your Next Opportunity',
            description: 'Browse all available job listings. Filter by category, location, job type, and more.',
            robots: 'index, follow',
            alternates: { canonical },           // added
            openGraph: {                         // added
                title: 'Job Listings | Find Your Next Opportunity',
                description: 'Browse all available job listings. Filter by category, location, job type, and more.',
                url: canonical,
                type: 'website',
            },
            twitter: {                           // added
                card: 'summary_large_image',
                title: 'Job Listings | Find Your Next Opportunity',
                description: 'Browse all available job listings. Filter by category, location, job type, and more.',
                // url: canonical,
            },
        };
    }

    return {
        title: meta.title || 'Job Listings | Find Your Next Opportunity',
        description: meta.description || undefined,
        keywords: meta.keywords || undefined,
        robots: meta.robots || 'index, follow',
        alternates: { canonical },               // always set
        icons: meta.logo
            ? { icon: meta.logo, apple: meta.logo }
            : undefined,
        openGraph: {
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            url: canonical,                      // always set
            type: 'website',
            images: meta.ogImage
                ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            // url: canonical,                      // always set
            images: meta.ogImage
                ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                : undefined,
        },
    };
}

export default function JobsPage() {
    return (
        <Wrapper>
            <HeaderOne />
            <Breadcrumb title="Jobs" subtitle="Jobs" bg_img="career-breadcrumb-bg" />
            <JobsArea />
            {/* <CtaHomeTwo /> */}
            <FooterOne />
        </Wrapper>
    );
}