// src/app/actions/blogActions.ts
'use server';

import connectToDatabase from '../../lib/mongooes';
import BlogPost from '../../modal/BlogPost';
import type { SiteSlug } from '../../modal/sharedListing';

export interface BlogPostItem {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  date: string;
  slug: string;
  order: number;
}

function toBlogItem(doc: any): BlogPostItem | null {
  if (!doc?._id || !doc?.slug) return null;
  return {
    id: doc._id.toString(),
    title: doc.title ?? 'Untitled',
    excerpt: doc.excerpt ?? '',
    imageUrl: doc.imageUrl ?? '/fallback-blog.jpg',
    category: doc.category ?? 'Uncategorized',
    date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
    slug: doc.slug,
    order: typeof doc.order === 'number' ? doc.order : 999,
  };
}

// ─────────────────────────────────────────────────────────────
// Helper: builds the public filter (status + site/time visibility)
// ─────────────────────────────────────────────────────────────
function buildBlogFilter(site?: SiteSlug) {
  const now = new Date();

  // Condition that matches "no schedule at all" → global visibility
  const noSchedule = {
    $or: [
      { siteWindows: { $exists: false } },   // field not present
      { siteWindows: null },                 // explicit null
      { siteWindows: { $size: 0 } },         // empty array
    ],
  };

  const base: any = {
    status: 'published',
  };

  if (site) {
    // For a specific site: show if no schedule OR a window for that site has started
    base.$or = [
      noSchedule,
      {
        siteWindows: {
          $elemMatch: {
            site: site,
            startAt: { $lte: now },
          },
        },
      },
    ];
  } else {
    // No site specified: show if no schedule OR any window has started
    base.$or = [
      noSchedule,
      {
        siteWindows: {
          $elemMatch: {
            startAt: { $lte: now },
          },
        },
      },
    ];
  }

  return base;
}

// ─────────────────────────────────────────────────────────────
// Helper: resolves effective site
// ─────────────────────────────────────────────────────────────
function resolveSite(site?: SiteSlug): SiteSlug | undefined {
  if (site) return site;
  const envSite = process.env.NEXT_PUBLIC_SITE_ID;
  return envSite ? (envSite as SiteSlug) : undefined;
}

// ─────────────────────────────────────────────────────────────
// 1. All public posts (blog list page)
// ─────────────────────────────────────────────────────────────
export async function getAllBlogPosts(
  site?: SiteSlug,
): Promise<BlogPostItem[]> {
  const effectiveSite = resolveSite(site);

  try {
    await connectToDatabase();

    const posts = await BlogPost.find(buildBlogFilter(effectiveSite))
      .sort({ order: 1, date: -1 })
      .lean();

    return posts.map(toBlogItem).filter((p: any): p is BlogPostItem => p !== null);
  } catch (error) {
    console.error('getAllBlogPosts error:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// 2. Single public post by slug
// ─────────────────────────────────────────────────────────────
export async function getBlogPostBySlug(
  slug: string,
  site?: SiteSlug,
): Promise<BlogPostItem | null> {
  if (!slug || typeof slug !== 'string') {
    console.warn('getBlogPostBySlug called with invalid slug:', slug);
    return null;
  }

  const effectiveSite = resolveSite(site);

  try {
    await connectToDatabase();

    const filter = buildBlogFilter(effectiveSite);
    filter.slug = slug; // add slug condition

    const post = await BlogPost.findOne(filter).lean();
    if (!post) return null;

    return toBlogItem(post);
  } catch (error) {
    console.error(`Error in getBlogPostBySlug for slug "${slug}":`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Latest 3 public posts (sidebar)
// ─────────────────────────────────────────────────────────────
export async function getLatestBlogPosts(
  site?: SiteSlug,
): Promise<BlogPostItem[]> {
  const effectiveSite = resolveSite(site);

  try {
    await connectToDatabase();

    const posts = await BlogPost.find(buildBlogFilter(effectiveSite))
      .sort({ date: -1 })
      .limit(5)
      .lean();

    if (!posts || !Array.isArray(posts)) return [];

    return posts.map(toBlogItem).filter((p): p is BlogPostItem => p !== null);
  } catch (error) {
    console.error('getLatestBlogPosts error:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Comments (unchanged)
// ─────────────────────────────────────────────────────────────
export interface CommentItem {
  id: string;
  blogSlug: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  parentId: string | null;
  createdAt: string;
}

export async function getBlogComments(slug: string): Promise<CommentItem[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/blog-comments?slug=${encodeURIComponent(slug)}&perPage=50`,
      { next: { tags: [`blog-comments-${slug}`], revalidate: 30 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch (err) {
    console.error('getBlogComments error:', err);
    return [];
  }
}