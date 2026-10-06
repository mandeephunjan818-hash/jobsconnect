// src/app/(jobs)/jobs/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchPageMetadata } from '../../lib/fetchPageMetadata';
import Breadcrumb from '../Breadcrumb';
import JobsAreaClient from '../../components/jobs/JobsAreaClient';
import { unstable_cache } from 'next/cache';
import { getAllJobListings } from '../actions/jobListAction';

// Makes ISR explicit at the route level: the static shell of this page is
// regenerated at most once every 60s, matching the unstable_cache below.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const meta = await fetchPageMetadata('/jobs');

    if (!meta) {
        return {
            title: 'Job Listings | Find Your Next Opportunity',
            description: 'Browse all available job listings. Filter by category, location, job type, and more.',
            robots: 'index, follow',
        };
    }

    return {
        title: meta.title || 'Job Listings | Find Your Next Opportunity',
        description: meta.description || undefined,
        keywords: meta.keywords || undefined,
        robots: meta.robots || 'index, follow',
        alternates: meta.canonicalUrl
            ? { canonical: meta.canonicalUrl }
            : undefined,
        icons: meta.logo
            ? { icon: meta.logo, apple: meta.logo }
            : undefined,
        openGraph: {
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            url: meta.canonicalUrl || undefined,
            type: 'website',
            images: meta.ogImage
                ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            images: meta.ogImage
                ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                : undefined,
        },
    };
}

const getCachedListings = unstable_cache(
    () => getAllJobListings(),
    ['all-job-listings'],
    { revalidate: 1, tags: ['listings'] },
);

// Lightweight fallback shown only for the instant before hydration picks up
// the real searchParams — keeps layout stable, no flash of empty content.
function JobsAreaFallback() {
    return (
        <section className="jd-section">
            <div className="container">
                <div className="jd-layout">
                    <aside className="jd-sidebar" />
                    <div className="jd-main">
                        <div className="jd-toolbar">
                            <p className="jd-toolbar__count">Loading jobs…</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default async function JobsPage() {
    const listings = await getCachedListings();

    return (
        <div className="body_wrap sco_agency">
            <Breadcrumb />
            <Suspense fallback={<JobsAreaFallback />}>
                <JobsAreaClient allListings={listings} />
            </Suspense>
        </div>
    );
}