// ─────────────────────────────────────────────────────────────
// BrandFetcher.tsx   (Server Component)
//
// Drop this wherever BrandHomeThree was used.
// Pass the site slug so the same fetcher works across all sites.
// ─────────────────────────────────────────────────────────────

import { getActiveBrandsForSite } from '../../../app/actions/brandAction';
import type { SiteSlug } from '../../../../modal/sharedListing';
import BrandHomeThree from './BrandHomeThreeClient';

// ── Fallback logos — shown when DB returns nothing ────────────
import brand1_img from '@/assets/images/brand/brand1.svg';
import brand2_img from '@/assets/images/brand/brand2.svg';
import brand3_img from '@/assets/images/brand/brand3.svg';
import brand4_img from '@/assets/images/brand/brand4.svg';
import brand5_img from '@/assets/images/brand/brand5.svg';

const FALLBACK = [
  { _id: 'f1', logoUrl: brand1_img.src, logoAlt: 'Brand 1', order: 1 },
  { _id: 'f2', logoUrl: brand2_img.src, logoAlt: 'Brand 2', order: 2 },
  { _id: 'f3', logoUrl: brand3_img.src, logoAlt: 'Brand 3', order: 3 },
  { _id: 'f4', logoUrl: brand4_img.src, logoAlt: 'Brand 4', order: 4 },
  { _id: 'f5', logoUrl: brand5_img.src, logoAlt: 'Brand 5', order: 5 },
];

interface Props {
  site: SiteSlug;
  style_2?: boolean;
}

export default async function BrandFetcher({ site, style_2 }: Props) {
  const brands = await getActiveBrandsForSite(site);
  return (
    <BrandHomeThree
      brands={brands.length > 0 ? brands : FALLBACK}
      style_2={style_2}
    />
  );
}