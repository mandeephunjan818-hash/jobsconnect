// ─────────────────────────────────────────────────────────────
// WhyChooseFetcher.tsx   (Server Component)
// Drop this wherever WhyChooseHomeOne was used.
// Pass the site slug via props so the same component works
// across all your sites.
// ─────────────────────────────────────────────────────────────

import { getActiveWhyChooseUs } from '../../../app/actions/whyChooseAction';
import type { SiteSlug } from '../../../../modal/sharedWhyChoose';
import WhyChooseHomeOne from './WhyChooseHomeOneClient';

// ── Fallback data — shown when DB returns nothing ─────────────
import thumb_img from '@/assets/images/v1/thumb-03.png';
import play_img from '@/assets/images/v2/play-btn1.svg';

const FALLBACK = {
  tagline: 'What We Deliver',
  title: 'We source top talent for careers',
  paragraph: 'Staffing solutions for modern enterprises is a service that quickly provides expert vetting & candidates to scale.',
  skillBars: [
    { label: 'Headhunting', percentage: 80, order: 1 },
    { label: 'Staffing', percentage: 75, order: 2 },
    { label: 'Team Building', percentage: 99, order: 3 },
  ],
  youtubeId: 'YagzZeJtqkg',
  thumbnailUrl: thumb_img.src,
  playButtonImageUrl: play_img.src,
};

interface Props {
  site: SiteSlug;
}

export default async function WhyChooseFetcher({ site }: Props) {
  const data = await getActiveWhyChooseUs(site);
  return <WhyChooseHomeOne data={data ?? FALLBACK} />;
}