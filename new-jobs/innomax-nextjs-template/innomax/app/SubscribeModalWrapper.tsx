// components/common/SubscribeModalWrapper.tsx
import { getSiteConfig } from '../app/actions/siteConfigAction';
import SubscribeModalNew from './SubscribeModalNew';

export default async function SubscribeModalWrapper() {
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
        console.error('Failed to load site config for subscribe modal:', error);
    }

    return <SubscribeModalNew logoUrl={logoUrl} logoAlt={logoAlt} />;
}