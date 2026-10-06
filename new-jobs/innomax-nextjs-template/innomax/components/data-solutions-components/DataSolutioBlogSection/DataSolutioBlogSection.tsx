import { unstable_cache } from 'next/cache';

import { getAllJobListings } from '../../../app/actions/jobListAction';
import DataSolutioBlogSectionClient from './DataSolutioBlogSectionClient';

// ISR: cached fetch, revalidated every 60s, independent of the /jobs page cache.
const getCachedListings = unstable_cache(
  () => getAllJobListings(),
  ['all-job-listings-home'],
  { revalidate: 1, tags: ['listings'] },
);

export default async function DataSolutioBlogSection() {
  const allListings = await getCachedListings();

  const featured = [...allListings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return <DataSolutioBlogSectionClient jobs={featured} />;
}