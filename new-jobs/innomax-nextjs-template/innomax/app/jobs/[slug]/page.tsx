import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';

import { fetchPageMetadata } from '../../../lib/fetchPageMetadata';
import Breadcrumb from '../../Breadcrumb';
import JobDetailsView from '../../../components/jobs/JobDetailsView';
import { getJobBySlug, getAllJobSlugs } from '../../actions/jobListAction';

export const revalidate = 60;

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const slugs = await getAllJobSlugs();
    return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const meta = await fetchPageMetadata(`/jobs/${slug}`);

    if (meta) {
        return {
            title: meta.title,
            description: meta.description || undefined,
            keywords: meta.keywords || undefined,
            robots: meta.robots || 'index, follow',
            alternates: meta.canonicalUrl ? { canonical: meta.canonicalUrl } : undefined,
            icons: meta.logo ? { icon: meta.logo, apple: meta.logo } : undefined,
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

    // Fallback: derive metadata straight from the job document
    const job = await getJobBySlug(slug);
    if (!job) {
        return { title: 'Job Listing Not Found', robots: 'noindex, nofollow' };
    }

    const plainOverview = job.overview.replace(/<[^>]*>/g, '');
    const description = (plainOverview || job.description || '')
        .slice(0, 155)
        .trim();

    return {
        title: `${job.title} at ${job.companyName} | Job Listings`,
        description,
        keywords: [
            job.title,
            job.companyName,
            job.jobMode,
            job.jobType,
            ...(job.categories ?? []),
            ...job.slots.map(s => s.city).filter(Boolean),
        ].filter(Boolean).join(', '),
        robots: 'index, follow',
        openGraph: {
            title: job.title,
            description,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: job.title,
            description,
        },
    };
}

const getCachedJob = (slug: string) =>
    unstable_cache(
        () => getJobBySlug(slug),
        [`job-${slug}`],
        { revalidate: 1, tags: ['listings', `listing-${slug}`] },
    )();

export default async function SingleJobPage({ params }: Props) {
    const { slug } = await params;
    const job = await getCachedJob(slug);

    if (!job) notFound();

    return (
        <div className="body_wrap sco_agency">
            <Breadcrumb />
            <JobDetailsView job={job} />
        </div>
    );
}