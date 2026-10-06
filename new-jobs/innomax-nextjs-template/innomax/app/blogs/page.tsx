// app/blog/page.tsx
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { fetchPageMetadata } from '../../lib/fetchPageMetadata';
import Breadcrumb from '../Breadcrumb';
import BlogGridClient from '../../components/blog/BlogGridClient';
import { getAllBlogPosts } from '../actions/blogActions';

export async function generateMetadata(): Promise<Metadata> {
    const meta = await fetchPageMetadata('/blog');

    // Static base URL from environment (build‑time, no request headers)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pagePath = '/blog';
    const canonical = meta?.canonicalUrl || `${baseUrl.replace(/\/$/, '')}${pagePath}`;

    if (!meta) {
        return {
            title: 'Blog | Career Tips & Job Search Insights',
            description: 'Browse all our articles on career advice, job search strategy, and hiring trends.',
            robots: 'index, follow',
            alternates: { canonical },                     // always present
            openGraph: {
                title: 'Blog | Career Tips & Job Search Insights',
                description: 'Browse all our articles on career advice, job search strategy, and hiring trends.',
                url: canonical,
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: 'Blog | Career Tips & Job Search Insights',
                description: 'Browse all our articles on career advice, job search strategy, and hiring trends.',
                // url: canonical,
            },
        };
    }

    return {
        title: meta.title || 'Blog | Career Tips & Job Search Insights',
        description: meta.description || undefined,
        keywords: meta.keywords || undefined,
        robots: meta.robots || 'index, follow',
        alternates: { canonical },                       // always set
        icons: meta.logo ? { icon: meta.logo, apple: meta.logo } : undefined,
        openGraph: {
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            url: canonical,                              // always set
            type: 'website',
            images: meta.ogImage
                ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description,
            // url: canonical,                              // always set
            images: meta.ogImage
                ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
                : undefined,
        },
    };
}

const getCachedAllPosts = unstable_cache(
    () => getAllBlogPosts(),
    ['all-blog-posts'],
    { revalidate: 1, tags: ['blogs'] },
);

export default async function BlogPage() {
    const posts = await getCachedAllPosts();

    return (
        <div className="body_wrap sco_agency">
            <Breadcrumb />
            <section className="blog blogp-section pos-rel pt-150 pb-150">
                <div className="container">
                    <div className="da-blog-wrapper">
                        <div className="sec-title--two text-center mb-30">
                            <div className="sub-title wow fadeInDown tm-badge" data-wow-duration="600ms">
                                <i className="fal fa-newspaper me-2" aria-hidden="true" /> Our Blog
                            </div>
                            <h2 className="title wow fadeInDown" data-wow-delay="150ms" data-wow-duration="600ms">
                                Career Tips &amp; Job Search Insights
                            </h2>
                        </div>

                        <BlogGridClient posts={posts} />
                    </div>
                </div>
            </section>
        </div>
    );
}