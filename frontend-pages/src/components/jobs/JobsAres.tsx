// src/components/jobs/JobsArea.tsx
import { unstable_cache } from 'next/cache';
import { getAllJobListings } from '@/app/actions/jobListAction';
import JobsAreaClient from './JobsAreaClient';
import { Suspense } from 'react';

const getCachedListings = unstable_cache(
    () => getAllJobListings(),
    ['all-job-listings'],
    {revalidate: 1, tags: ['listings'] },
);

export default async function JobsArea() {
    const listings = await getCachedListings();

    // Suspense is REQUIRED for useSearchParams() to prevent hydration mismatches 
    // and "stuck" filters when navigating from other pages.
    return (
        <Suspense fallback={<div className="container py-5 text-center">Loading jobs...</div>}>
            <JobsAreaClient allListings={listings} />
        </Suspense>
    );
}