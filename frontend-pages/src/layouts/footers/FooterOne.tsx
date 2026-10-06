import { getSiteConfig } from '@/app/actions/siteConfigAction';
import FooterOneClient from './FooterOneClient';

export default async function FooterOne() {

  let logoUrl: string | undefined;
  let logoAlt: string | undefined;
  let contactEmail: string | undefined;
  let phone: string | undefined;
  let address: string | undefined;

  const envSite = process.env.NEXT_PUBLIC_SITE_ID;

  try {
    const config = await getSiteConfig(envSite);
    if (config) {
      logoUrl = config.logoUrl;
      logoAlt = config.logoAlt;
      contactEmail = config.contactEmail;
      phone = config.phone;
      address = config.address;
    }
  } catch (error) {
    console.error('Failed to load site config for footer:', error);
  }

  return (
    <FooterOneClient
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      contactEmail={contactEmail}
      phone={phone}
      address={address}
    />
  );
}