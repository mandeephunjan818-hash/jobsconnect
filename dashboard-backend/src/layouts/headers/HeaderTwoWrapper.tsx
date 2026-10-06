import { getSiteConfig } from '@/app/actions/siteConfigAction';
import HeaderClient from './HeaderClient';

export default async function HeaderTwoWrapper() {
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

    return <HeaderClient logoUrl={logoUrl} logoAlt={logoAlt} />;
}