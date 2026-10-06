import { getSiteConfig } from '@/app/actions/siteConfigAction';
import ContactAreaClient from './ContactAreaClient';

export default async function ContactArea() {
    let phone: string | undefined;

    const envSite = process.env.NEXT_PUBLIC_SITE_ID;

    try {
        const config = await getSiteConfig(envSite);
        if (config) {
            phone = config.phone;
        }
    } catch (error) {
        console.error('Failed to load site config for contact section:', error);
    }

    return <ContactAreaClient phone={phone} />;
}