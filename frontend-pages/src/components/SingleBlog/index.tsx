import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getAllBlogPosts, getBlogComments, getBlogPostBySlug } from '@/app/actions/blogActions';
import Breadcrumb from "@/common/Breadcrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import CtaHomeTwo from "../homes/home-2/CtaHomeTwo";
import SingleBlogArea from "./SingleBlogArea";
import FooterOne from '@/layouts/footers/FooterOne';


const getCachedPost = unstable_cache(
  (slug: string) => getBlogPostBySlug(slug),
  ['single-blog-post'],
  {revalidate: 1, tags: ['blog-posts'] }
);

const getCachedAllPosts = unstable_cache(
  () => getAllBlogPosts(),
  ['all-blog-posts'],
  {revalidate: 1, tags: ['blog-posts'] }
);

const getCachedComments = unstable_cache(
  (slug: string) => getBlogComments(slug),
  ['blog-comments'],
  {revalidate: 1, tags: ['blog-posts'] }
);

interface Props {
  params: { slug: string };
}

const SingleBlog = async ({ params }: Props) => {

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
      <CtaHomeTwo />
      <FooterOne />
    </Wrapper>
  );
};

export default SingleBlog;