// components/Footer/FooterServer.tsx
import { getSiteConfig } from '../../../app/actions/siteConfigAction';
import { getLatestBlogPosts } from '../../../app/actions/blogActions';
import { getCachedTopCategories } from '../../../app/actions/categoryAction';
import FooterClient from './FooterClient';

export default async function FooterServer() {
  const envSite = process.env.NEXT_PUBLIC_SITE_ID;

  // Fetch site config, categories, and latest 3 blog posts in parallel
  const [config, categories, blogPosts] = await Promise.all([
    getSiteConfig(envSite).catch(() => null),
    getCachedTopCategories().catch(() => []),
    getLatestBlogPosts().catch(() => []),
  ]);

  const logoUrl = config?.logoUrl;
  // No hardcoded brand fallback — if the backend has no name, FooterClient
  // shows "No data available" gracefully instead.
  const logoAlt = config?.logoAlt;

  // Map categories to the shape expected by the footer
  const footerCategories = categories.slice(0, 5).map((cat) => ({
    label: cat.name,
    href: cat.link || `/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`, // fallback link
    count: cat.count,
  }));

  // Map latest blog posts (up to 3) to the footer format
  const footerBlogs = blogPosts.slice(0, 3).map((post) => ({
    title: post.title,
    date: post.date, // ISO string – will be formatted on the client
    href: `/blog/${post.slug}`,
  }));

  return (
    <FooterClient
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      categories={footerCategories}
      latestBlogs={footerBlogs}
    />
  );
}