import type { Metadata } from "next";
import { fetchPageMetadata } from '@/lib/fetchPageMetadata';
import { redirect } from 'next/navigation';
import getLocalImageUrl from '@/utils/ChangeImageUrl';

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchPageMetadata('/');
  if (!meta) {
    return { title: 'Boomr' };
  }

  // Base URL from environment (static, no request dependency)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const fallbackCanonical = `${baseUrl}/`; // because the fetched path is '/'

  const canonical = meta.canonicalUrl || fallbackCanonical;

  return {
    title: meta.title || 'Boomr',
    description: meta.description || undefined,
    keywords: meta.keywords || undefined,
    robots: meta.robots || undefined,
    alternates: {
      canonical,                                   // always set
    },
    icons: getLocalImageUrl(meta.logo)
      ? {
          icon: getLocalImageUrl(meta.logo),
          apple: getLocalImageUrl(meta.logo),
        }
      : undefined,
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      url: canonical,                              // always set
      type: 'website',
      images: getLocalImageUrl(meta.ogImage)
        ? [
            {
              url: getLocalImageUrl(meta.ogImage),
              alt: meta.ogImageAlt || meta.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      // url: canonical,                              // always set
      images: getLocalImageUrl(meta.ogImage)
        ? [
            {
              url: getLocalImageUrl(meta.ogImage),
              alt: meta.ogImageAlt || meta.title,
            },
          ]
        : undefined,
    },
  };
}


export default function index() {
  redirect('/auth/sign-in');
}