// src/app/(blog)/blog/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import {
  getAllBlogPosts,
  getBlogPostBySlug,
  getBlogComments,
} from '@/app/actions/blogActions';
import { fetchPageMetadata } from '../../../../../lib/fetchPageMetadata';
import Breadcrumb from '@/common/Breadcrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import Wrapper from '@/layouts/Wrapper';
import SingleBlogArea from '@/components/SingleBlog/SingleBlogArea';
import FooterOne from '@/layouts/footers/FooterOne';

export async function generateStaticParams() {
  try {
    const posts = await getAllBlogPosts();
    return posts.map(post => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

const getCachedPost = unstable_cache(
  (slug: string) => getBlogPostBySlug(slug),
  ['single-blog-post'],
  { revalidate: 1, tags: ['blog-posts'] }
);

const getCachedAllPosts = unstable_cache(
  () => getAllBlogPosts(),
  ['all-blog-posts'],
  { revalidate: 1, tags: ['blog-posts'] }
);

const getCachedComments = unstable_cache(
  (slug: string) => getBlogComments(slug),
  ['blog-comments'],
  { revalidate: 1, tags: ['blog-posts'] }
);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let slug: string;
  try {
    const resolved = await params;
    slug = resolved.slug;
  } catch (err) {
    console.error('Failed to resolve params in generateMetadata:', err);
    return {
      title: 'Blog Post',
      robots: 'index, follow',
    };
  }

  const urlPattern = `/blog/${slug}`;

  // Static fallback canonical for this page
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const fallbackCanonical = `${baseUrl.replace(/\/$/, '')}${urlPattern}`;

  // ── Try DB metadata first ──────────────────────────────────
  let meta = null;
  try {
    meta = await fetchPageMetadata(urlPattern);
  } catch (err) {
    console.error(`Error fetching metadata for ${urlPattern}:`, err);
  }

  if (meta) {
    const canonical = meta.canonicalUrl || fallbackCanonical;

    return {
      title: meta.title || 'Blog Post',
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
        type: 'article',
        images: meta.ogImage
          ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
          : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: meta.ogTitle || meta.title,
        description: meta.ogDescription || meta.description,
        // url: canonical,
        images: meta.ogImage
          ? [{ url: meta.ogImage, alt: meta.ogImageAlt || meta.title }]
          : undefined,
      },
    };
  }

  // ── Fallback: generate from blog post content ──────────────
  try {
    const post = await getBlogPostBySlug(slug);
    if (post) {
      const title = `${post.title}`;
      const description = post.excerpt || `Read "${post.title}" on Bizroo's blog.`;
      const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/blog/${slug}`;
      const publishedTime = post.date ? new Date(post.date).toISOString() : undefined;

      return {
        title,
        description,
        keywords: `${post.category}, business acquisition, ${post.title}, Bizroo`,
        robots: 'index, follow',
        alternates: { canonical: canonicalUrl },
        openGraph: {
          title,
          description,
          url: canonicalUrl,
          type: 'article',
          publishedTime,
          section: post.category,
          images: post.imageUrl
            ? [{ url: post.imageUrl, alt: post.title }]
            : undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          // url: canonicalUrl,
          images: post.imageUrl
            ? [{ url: post.imageUrl, alt: post.title }]
            : undefined,
        },
      };
    }
  } catch (err) {
    console.error(`Error fetching blog post "${slug}" for metadata fallback:`, err);
  }

  // ── Last resort default (no DB, no post) ────────────────────
  return {
    title: 'Blog Post | Jobs Connect',
    description: 'Read the latest articles on business acquisitions and more.',
    robots: 'index, follow',
    alternates: { canonical: fallbackCanonical },
    openGraph: {
      title: 'Blog Post | Jobs Connect',
      description: 'Read the latest articles on business acquisitions and more.',
      url: fallbackCanonical,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog Post | Jobs Connect',
      description: 'Read the latest articles on business acquisitions and more.',
      // url: fallbackCanonical,
    },
  };
}

export default async function SingleBlogPage({ params }: Props) {
  const { slug } = await params;

  const [post, allPosts, initialComments] = await Promise.all([
    getCachedPost(slug),
    getCachedAllPosts(),
    getCachedComments(slug),
  ]);

  if (!post) notFound();

  const latestPosts = allPosts.filter(p => p.slug !== slug).slice(0, 5);

  const categoryCounts: Record<string, number> = {};
  allPosts.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  });
  const categories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // const tagSet = new Set<string>();
  // allPosts.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
  // const allTags = Array.from(tagSet);

  return (
    <Wrapper>
      <HeaderOne />
      <Breadcrumb title={post.title} subtitle={post.title} bg_img="singleblog-breadcrumb-bg" />
      <SingleBlogArea
        post={post}
        latestPosts={latestPosts}
        categories={categories}
        // allTags={allTags}
        initialComments={initialComments}
      />
      {/* <CtaHomeTwo /> */}
      <FooterOne />
    </Wrapper>
  );
}