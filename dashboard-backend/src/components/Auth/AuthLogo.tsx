// src/components/auth/AuthLogo.tsx
import { getSiteConfig } from '@/app/actions/siteConfigAction';
import AuthLogoClient from './AuthLogoClient';

export default async function AuthLogo() {
    let logoUrl: string | undefined;
    let logoAlt: string | undefined;

    try {
        const config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
        if (config) {
            logoUrl = config.logoUrl;
            logoAlt = config.logoAlt;
        }
    } catch (error) {
        console.error('Failed to load site config for auth logo:', error);
    }

    return <AuthLogoClient logoUrl={logoUrl} logoAlt={logoAlt} />;
}