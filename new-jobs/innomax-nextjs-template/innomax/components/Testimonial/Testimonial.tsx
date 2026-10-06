// components/testimonial/TestimonialSectionFetcher.tsx
import { unstable_cache } from 'next/cache';
import { KNOWN_SITES } from '../../lib/sites'; // adjust path as needed
import { getAllTestimonials } from '../../app/actions/testimonialAction';
import TestimonialSectionClient from './TestimonialSectionClient';
import type { SiteSlug } from '../../modal/sharedListing';

// Cache wrapper (revalidates every 60s or as needed)
const getCachedTestimonials = (site: SiteSlug | undefined) => {
  const cacheKey = site ? ['testimonials-section', site] : ['testimonials-section', 'all'];
  return unstable_cache(
    () => getAllTestimonials(site),
    cacheKey,
    { revalidate: 1, tags: ['testimonials'] }
  );
};

export default async function TestimonialSectionFetcher() {
  const siteEnv = process.env.NEXT_PUBLIC_SITE_ID;

  let site: SiteSlug | undefined;
  if (siteEnv === '*') {
    site = '*';
  } else if (siteEnv && (KNOWN_SITES as readonly string[]).includes(siteEnv)) {
    site = siteEnv as SiteSlug;
  }

  const fetchWithCache = getCachedTestimonials(site);
  const testimonials = await fetchWithCache();

  return <TestimonialSectionClient testimonials={testimonials} />;
}