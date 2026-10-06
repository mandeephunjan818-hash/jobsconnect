// src/app/(jobs)/jobs/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';

import Wrapper from '@/layouts/Wrapper';
import HeaderOne from '@/layouts/headers/HeaderOne';
import Breadcrumb from '@/common/Breadcrumb';
import FooterOne from '@/layouts/footers/FooterOne';
import JobDetailsArea from '@/components/SingleCareer/CareerDetailsArea';

import { getJobBySlug, getAllJobSlugs } from '@/app/actions/jobListAction';
import { fetchPageMetadata } from '../../../../../lib/fetchPageMetadata';
import type { SiteSlug } from '../../../../../modal/sharedListing';

// ─── Site determination (static, from environment variable) ──────
const SITE: SiteSlug =
    (process.env.NEXT_PUBLIC_SITE_ID as SiteSlug) || 'jobs-connect.vercel.app';

// ─── Static params ────────────────────────────────────────────
export async function generateStaticParams() {
    const slugs = await getAllJobSlugs();
    return slugs.map(slug => ({ slug }));
}

// ─── Dynamic metadata ─────────────────────────────────────────
interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    let slug: string;
    try {
        slug = (await params).slug;
    } catch (err) {
        console.error('Failed to resolve params in generateMetadata:', err);
        return {
            title: 'Job Listing | Jobs',
            robots: 'index, follow',
        };
    }

    const urlPattern = `/jobs/${slug}`;

    // Static fallback canonical for this page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const fallbackCanonical = `${baseUrl.replace(/\/$/, '')}${urlPattern}`;

    // 1. Try site‑specific metadata from DB
    let meta = null;
    try {
        meta = await fetchPageMetadata(urlPattern, SITE);
    } catch (err) {
        console.error(`Error fetching metadata for ${urlPattern}:`, err);
    }

    if (meta) {
        const canonical = meta.canonicalUrl || fallbackCanonical;

        return {
            title: meta.title || 'Job Listing | Jobs',
            description: meta.description || undefined,
            keywords: meta.keywords || undefined,
            robots: meta.robots || 'index, follow',
            alternates: { canonical },
            icons: meta.logo
                ? { icon: meta.logo, apple: meta.logo }
                : undefined,
            openGraph: {
                title: meta.ogTitle || meta.title,
                description: meta.ogDescription || meta.description,
                url: canonical,
                type: 'website',
                images: meta.ogImage
                    ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                    : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: meta.ogTitle || meta.title,
                description: meta.ogDescription || meta.description,
                // url: canonical,
                images: meta.ogImage
                    ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                    : undefined,
            },
        };
    }

    // 2. Fallback: generate metadata from the job itself
    try {
        const job = await getJobBySlug(slug, SITE);
        if (job) {
            const title = `${job.title} | Job Listings`;
            const plainText = job.overview.replace(/<[^>]*>/g, '');
            const description = plainText.slice(0, 155) + (plainText.length > 155 ? '...' : '');
            const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/jobs/${slug}`;

            return {
                title,
                description,
                keywords: [
                    job.title,
                    job.jobMode,
                    job.jobType,
                    ...(job.categories ?? []),
                    ...(job.slots?.map((s: any) => s.city).filter(Boolean) ?? []),
                ].filter(Boolean).join(', '),
                robots: 'index, follow',
                alternates: { canonical: canonicalUrl },
                openGraph: {
                    title,
                    description,
                    url: canonicalUrl,
                    type: 'website',
                },
                twitter: {
                    card: 'summary_large_image',
                    title,
                    description,
                    // url: canonicalUrl,                // added
                },
            };
        }
    } catch (err) {
        console.error(`Error fetching job "${slug}" for metadata fallback:`, err);
    }

    // 3. Last resort default
    return {
        title: 'Job Listing | Jobs',
        description: 'View job details and apply today.',
        robots: 'index, follow',
        alternates: { canonical: fallbackCanonical },
        openGraph: {
            title: 'Job Listing | Jobs',
            description: 'View job details and apply today.',
            url: fallbackCanonical,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Job Listing | Jobs',
            description: 'View job details and apply today.',
            // url: fallbackCanonical,
        },
    };
}

// ─── Cached page data ────────────────────────────────────────
const getCachedJob = (slug: string) =>
    unstable_cache(
        () => getJobBySlug(slug, SITE),
        [`job-${SITE}-${slug}`],
        { revalidate: 1, tags: ['listings', `listing-${slug}`] },
    )();

// ─── Page component ──────────────────────────────────────────
export default async function SingleJobPage({ params }: Props) {
    const { slug } = await params;
    const job = await getCachedJob(slug);
    if (!job) notFound();

    return (
        <Wrapper>
            <HeaderOne />
            <Breadcrumb
                title={job.title}
                subtitle={job.title}
                bg_img="singlecareer-breadcrumb-bg"
            />
            <JobDetailsArea job={job} />
            <FooterOne />
        </Wrapper>
    );
}