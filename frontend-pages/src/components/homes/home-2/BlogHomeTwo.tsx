import { unstable_cache } from 'next/cache';
import { getLatestBlogPosts } from '../../../app/actions/blogActions';
import BlogHomeTwo from './BlogHomeTwoClient';

const getCachedLatestBlogs = unstable_cache(
  () => getLatestBlogPosts(),
  ['latest-blogs'],
  { revalidate: 1,tags: ['blogs'] }
);

export default async function BlogFetcher() {
  const posts = await getCachedLatestBlogs();
  return <BlogHomeTwo posts={posts} />;
}