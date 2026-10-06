// BlogPreviewSection.tsx  (server component — drop next to your Jobs section files)
import { unstable_cache } from 'next/cache';

import { getLatestBlogPosts } from '../../app/actions/blogActions';
import BlogPreviewSectionClient from './BlogPreviewSectionClient';

// ISR: cached fetch, revalidated every 60s, independent of the /blog page cache.
const getCachedBlogPosts = unstable_cache(
    () => getLatestBlogPosts(),
    ['latest-blogs'],
    { revalidate: 1, tags: ['blogs'] },
);

export default async function BlogPreviewSection() {
    const posts = await getCachedBlogPosts();

    // No published posts yet — skip the section instead of rendering
    // an empty heading with nothing underneath it.
    if (!posts.length) return null;

    const featured = posts.slice(0, 3);

    return <BlogPreviewSectionClient posts={featured} />;
}