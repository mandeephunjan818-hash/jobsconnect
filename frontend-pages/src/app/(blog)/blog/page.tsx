// src/app/(blog)/blog/page.tsx
import type { Metadata } from 'next';
import { fetchPageMetadata } from '../../../../lib/fetchPageMetadata';
import Breadcrumb from '@/common/Breadcrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import Wrapper from '@/layouts/Wrapper';
// import CtaHomeTwo from '@/components/homes/home-2/CtaHomeTwo';
import FooterOne from '@/layouts/footers/FooterOne';
import BlogArea from '@/components/blog/BlogArea';

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchPageMetadata('/blog');

  // Static base URL from environment (build‑time, no request headers)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pagePath = '/blog';
  const canonical = meta?.canonicalUrl || `${baseUrl}${pagePath}`;

  if (!meta) {
    return {
      title: 'Blog',
      description: 'Read the latest articles on business acquisitions and more.',
      robots: 'index, follow',
      alternates: { canonical },
      openGraph: {
        title: 'Blog',
        description: 'Read the latest articles on business acquisitions and more.',
        url: canonical,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Blog',
        description: 'Read the latest articles on business acquisitions and more.',
        // url: canonical,
      },
    };
  }

  return {
    title: meta.title || 'Blog',
    description: meta.description || undefined,
    keywords: meta.keywords || undefined,
    robots: meta.robots || 'index, follow',
    alternates: { canonical },
    icons: meta.logo
      ? { icon: meta.logo, apple: meta.logo }
      : undefined,
    openGraph: {
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      url: canonical,
      type: 'website',
      images: meta.ogImage
        ? [
            {
              url: meta.ogImage,
              alt: meta.ogImageAlt || meta.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle || meta.title,
      description: meta.ogDescription || meta.description,
      // url: canonical,
      images: meta.ogImage
        ? [
            {
              url: meta.ogImage,
              alt: meta.ogImageAlt || meta.title,
            },
          ]
        : undefined,
    },
  };
}

export default function BlogPage() {
  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title="Blog" subtitle="Blog" bg_img="blog-breadcrumb-bg" />
      <BlogArea />
      {/*<CtaHomeTwo /> */}
      <FooterOne />
    </Wrapper>
  );
}