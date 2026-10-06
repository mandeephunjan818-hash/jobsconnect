/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://jobs-connect.vercel.app/", // 🔁 replace with your actual domain
  generateRobotsTxt: true, // ⬅️ auto-creates robots.txt
  sitemapSize: 5000,
  changefreq: "weekly",
  priority: 0.7,
};
