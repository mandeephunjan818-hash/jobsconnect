// @/utils/getLocalImageUrl.ts

export default function getLocalImageUrl(fullUrl: string | undefined) {
    const cloudinaryBase = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/`;
    const siteDomain = process.env.NEXT_PUBLIC_SITE_URL || 'https://jobs-connect.vercel.app';

    if (!fullUrl) return '';

    // If it's a Cloudinary URL, replace the base with /media/ and prepend the domain
    if (fullUrl.startsWith(cloudinaryBase)) {
        const relativePath = fullUrl.replace(cloudinaryBase, '/media/');
        return `${siteDomain}${relativePath}`;
    }

    // Already a relative path? Prepend domain
    if (fullUrl.startsWith('/')) {
        return `${siteDomain}${fullUrl}`;
    }

    // Otherwise return as‑is (absolute URL)
    return fullUrl;
}