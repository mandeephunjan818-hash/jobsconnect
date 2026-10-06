// app/components/Header3/HeaderServer.tsx
import { getSiteConfig } from '../../app/actions/siteConfigAction';
import HeaderThreeClient from './HeaderClient';

export default async function HeaderThree() {
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

    return <HeaderThreeClient logoUrl={logoUrl} logoAlt={logoAlt} />;
}