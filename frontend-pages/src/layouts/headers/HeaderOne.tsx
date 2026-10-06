import { getSiteConfig } from '@/app/actions/siteConfigAction';
import HeaderOneClient from './HeaderOneClient';

export default async function HeaderOne() {

  let logoUrl: string | undefined;
  let logoAlt: string | undefined;

  const envSite = process.env.NEXT_PUBLIC_SITE_ID;

  try {
    const config = await getSiteConfig(envSite);
    if (config) {
      logoUrl = config.logoUrl;
      logoAlt = config.logoAlt;
    }
  } catch (error) {
    console.error('Failed to load site config for header:', error);
  }

  return <HeaderOneClient logoUrl={logoUrl} logoAlt={logoAlt} />;
}