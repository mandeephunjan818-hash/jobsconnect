// src/components/blog/BlogArea.tsx
import { getAllBlogPosts } from '@/app/actions/blogActions';
import { unstable_cache } from 'next/cache';
import BlogAreaClient from './BlogAreaClient';

const getCachedPosts = unstable_cache(
  () => getAllBlogPosts(),
  ['all-blog-posts'],
  {revalidate: 1, tags: ['blog-posts'] }
);

export default async function BlogArea() {
  const posts = await getCachedPosts();
  return <BlogAreaClient allPosts={posts} />;
}