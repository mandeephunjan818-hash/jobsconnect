'use server'
/**
 * JobListFetcher.tsx   (Server Component)
 *
 * Fetches top 6 homepage job previews for a given site
 * and passes them to the client component.
 *
 * Usage:
 *   <JobListFetcher site="new-jobs-fawn.vercel.app" />
 *   <JobListFetcher site="jobsrefugee.ca" />
 */

import { getHomepageJobPreviews } from '../../app/actions/jobListAction';
import type { SiteSlug } from '../../../modal/sharedListing';
import JobListArea from './JobListAreaClient';

interface Props {
  site: SiteSlug;
}

export default async function JobListFetcher({ site }: Props) {
  const jobs = await getHomepageJobPreviews(site);
  return <JobListArea jobs={jobs?.length > 0 ? jobs : []} />;
}