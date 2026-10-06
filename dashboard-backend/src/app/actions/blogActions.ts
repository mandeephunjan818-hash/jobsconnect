'use server';

import connectToDatabase from '@/lib/mongooes';
import BlogPost from '@/modal/BlogPost';

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

/**
 * Fetch all blog posts directly from MongoDB.
 * Returns empty array on any error to prevent build failures.
 */
export async function getAllBlogPosts(): Promise<BlogPostItem[]> {
  try {
    await connectToDatabase();

    const posts = await BlogPost.find({})
      .sort({ order: 1, date: -1 })
      .lean();

    if (!posts || !Array.isArray(posts)) {
      return [];
    }

    const results: BlogPostItem[] = [];

    for (const doc of posts) {
      // Skip if missing critical fields
      if (!doc?._id || !doc?.slug) continue;

      try {
        results.push({
          id: doc._id.toString(),
          title: doc.title ?? 'Untitled',
          excerpt: doc.excerpt ?? '',
          imageUrl: doc.imageUrl ?? '/fallback-blog.jpg',
          category: doc.category ?? 'Uncategorized',
          date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
          slug: doc.slug,
          order: typeof doc.order === 'number' ? doc.order : 999,
        });
      } catch (itemError) {
        console.error(`Error processing blog post ${doc._id}:`, itemError);
        continue; // Skip this item but keep building
      }
    }

    return results;
  } catch (error) {
    console.error('Fatal error in getAllBlogPosts:', error);
    return []; // Never throw – return empty array to keep build alive
  }
}

/**
 * Fetch a single blog post by slug.
 * Returns null if not found or on error.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPostItem | null> {
  // Validate input
  if (!slug || typeof slug !== 'string') {
    console.warn('getBlogPostBySlug called with invalid slug:', slug);
    return null;
  }

  try {
    await connectToDatabase();

    const post = await BlogPost.findOne({ slug }).lean();

    if (!post) return null;

    // Defensive mapping
    return {
      id: post._id.toString(),
      title: post.title ?? 'Untitled',
      excerpt: post.excerpt ?? '',
      imageUrl: post.imageUrl ?? '/fallback-blog.jpg',
      category: post.category ?? 'Uncategorized',
      date: post.date ? new Date(post.date).toISOString() : new Date().toISOString(),
      slug: post.slug,
      order: typeof post.order === 'number' ? post.order : 999,
    };
  } catch (error) {
    console.error(`Error in getBlogPostBySlug for slug "${slug}":`, error);
    return null; // Return null so calling code can handle with notFound()
  }
}