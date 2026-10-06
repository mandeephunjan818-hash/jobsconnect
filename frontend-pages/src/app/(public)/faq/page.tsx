import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { fetchPageMetadata } from "../../../../lib/fetchPageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchPageMetadata('/faq');

  // Static base URL from environment (build‑time, no request headers)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pagePath = '/faq';
  const canonical = meta?.canonicalUrl || `${baseUrl.replace(/\/$/, '')}${pagePath}`;

  if (!meta) {
    return {
      title: {
        default: "Jobs Connect - Job Board & Career Opportunities Platform",
        template: "%s | Jobs Connect",
      },
      description:
        "Jobs Connect is a cutting-edge platform linking employers and professionals with career opportunities across all industries.",
      robots: 'index, follow',
      alternates: { canonical },                     // added
      icons: {
        icon: "/favicon.ico",
        apple: "/favicon.ico",
      },
      openGraph: {                                   // added
        title: "Jobs Connect - Job Board & Career Opportunities Platform",
        description:
          "Jobs Connect is a cutting-edge platform linking employers and professionals with career opportunities across all industries.",
        url: canonical,
        type: 'website',
      },
      twitter: {                                     // added
        card: 'summary_large_image',
        title: "Jobs Connect - Job Board & Career Opportunities Platform",
        description:
          "Jobs Connect is a cutting-edge platform linking employers and professionals with career opportunities across all industries.",
        // url: canonical,
      },
    };
  }

  return {
    title: meta.title || "Jobs Connect - Job Board & Career Opportunities Platform",
    description: meta.description || undefined,
    keywords: meta.keywords || undefined,
    robots: meta.robots || 'index, follow',
    alternates: { canonical },                       // always set
    icons: meta.logo
      ? { icon: meta.logo, apple: meta.logo }
      : { icon: "/favicon.ico", apple: "/favicon.ico" },
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      url: canonical,                                // always set
      type: 'website',
      images: meta.ogImage
        ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      // url: canonical,                                // always set
      images: meta.ogImage
        ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
        : undefined,
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

const Faq = dynamic(() => import("@/components/faq"), {
  loading: () => <p>Loading FAQ...</p>,
  ssr: true,
});

export default function Index() {
  return <Faq />;
}