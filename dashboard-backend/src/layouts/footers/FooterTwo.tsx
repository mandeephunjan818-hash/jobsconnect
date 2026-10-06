// src/layouts/footers/FooterTwoWrapper.tsx
import { getSiteConfig } from '@/app/actions/siteConfigAction';
import FooterTwo from './FooterTwoClient';

export default async function FooterTwoWrapper() {
  let logoUrl: string | undefined;
  let logoAlt: string | undefined;
  let siteName: string | undefined;
  let contactEmail: string | undefined;
  let phone: string | undefined;
  let address: string | undefined;

  const envSite = process.env.NEXT_PUBLIC_SITE_ID;

  try {
    const config = await getSiteConfig(envSite);
    if (config) {
      logoUrl = config.logoUrl;
      logoAlt = config.logoAlt;
      // siteName comes from logoAlt as a reasonable fallback; add a siteName
      // field to SiteConfigData if you want to store it separately
      siteName = config.logoAlt;
      contactEmail = config.contactEmail;
      phone = config.phone;
      address = config.address;
    }
  } catch (error) {
    console.error('Failed to load site config for footer:', error);
  }

  return (
    <FooterTwo
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      siteName={siteName}
      contactEmail={contactEmail}
      phone={phone}
      address={address}
    />
  );
}