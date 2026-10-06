// src/components/TestimonialFetcher.tsx
import { unstable_cache } from 'next/cache';
import { KNOWN_SITES } from '../../../../lib/sites';              // <-- import known sites
import { getAllTestimonials } from '../../../app/actions/testimonialAction';
import TestimonialHomeOneClient from './TestimonialHomeOneClient';
import type { SiteSlug } from '../../../../modal/sharedListing';

// Dynamically cache testimonials per site
const getCachedTestimonials = (site: SiteSlug | undefined) => {
  const cacheKey = site ? ['testimonials', site] : ['testimonials', 'all'];
  return unstable_cache(
    () => getAllTestimonials(site),
    cacheKey,
    { revalidate: 1,tags: ['testimonials'] }
  );
};

interface Props {
  style_2?: boolean;
}

export default async function TestimonialFetcher({ style_2 }: Props) {
  const siteEnv = process.env.NEXT_PUBLIC_SITE_ID;

  // Determine the actual SiteSlug or '*' to pass to the action
  let site: SiteSlug | undefined;

  if (siteEnv === '*') {
    site = '*';                     // explicit global filter
  } else if (siteEnv && (KNOWN_SITES as readonly string[]).includes(siteEnv)) {
    site = siteEnv as SiteSlug;     // known site
  }
  // else undefined → fetch all

  const fetchWithCache = getCachedTestimonials(site);
  const testimonials = await fetchWithCache();

  return (
    <TestimonialHomeOneClient
      style_2={style_2}
      testimonials={testimonials}
    />
  );
}