// import SignUp from "@/components/Auth/SignUp";
import type { Metadata } from "next";
import { fetchPageMetadata } from '@/lib/fetchPageMetadata';
import "../../../../public/assets/scss/_auth.scss";
import getLocalImageUrl from '@/utils/ChangeImageUrl';
import { getSiteConfig } from "@/app/actions/siteConfigAction";
import OtpSignUp from "@/components/Auth/OtpSignUp";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchPageMetadata('/auth/sign-up');
  if (!meta) {
    return { title: 'JobsConnect' };
  }

  // Static fallback for canonical & social URLs
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pagePath = '/auth/sign-up';
  const canonical = meta.canonicalUrl || `${baseUrl}${pagePath}`;

  return {
    title: meta.title || 'JobsConnect',
    description: meta.description || undefined,
    keywords: meta.keywords || undefined,
    robots: meta.robots || undefined,
    alternates: {
      canonical,                                // always set
    },
    icons: getLocalImageUrl(meta.logo)
      ? {
          icon: getLocalImageUrl(meta.logo),
          apple: meta.logo,
        }
      : undefined,
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      url: canonical,                           // always set
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
      // url: canonical,                           // always set
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


export default async function Page() {
  let logoUrl: string | undefined;
  let logoAlt: string | undefined;
  try {
    const config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
    if (config) { logoUrl = config.logoUrl; logoAlt = config.logoAlt; }
  } catch { }
  // return <SignUp logoUrl={(logoUrl ? logoUrl : "/") || "/"} logoAlt={(logoAlt ? logoAlt : "/") || "/"} />;
  return <OtpSignUp logoUrl={(logoUrl ? logoUrl : "/") || "/"} logoAlt={(logoAlt ? logoAlt : "/") || "/"} />;
}