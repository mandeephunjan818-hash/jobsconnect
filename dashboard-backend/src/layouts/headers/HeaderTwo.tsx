"use client";
// src/layouts/headers/StaticHeaderTwo.tsx
import { getSiteConfig } from '@/app/actions/siteConfigAction';
import HeaderClientWrapper from './HeaderClientWrapper';
import AuthButtonWrapper from './AuthButtonWrapper';

export default async function StaticHeaderTwo() {
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

    return (
        <HeaderClientWrapper logoUrl={logoUrl} logoAlt={logoAlt}>
            {({ isOpen }) => (
                <AuthButtonWrapper isOpen={isOpen} />
            )}
        </HeaderClientWrapper>
    );
}