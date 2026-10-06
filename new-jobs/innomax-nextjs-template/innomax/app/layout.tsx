import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "../styles/fontawesome.css";
import "../styles/themify-icons.css";
import "../styles/animate.css";
import "../styles/cursor.css";
import "../styles/custom-font.css";
import "../styles/main.css";
import { getSiteConfig } from "../app/actions/siteConfigAction";
import SubscribeModalWrapper from "./SubscribeModalWrapper";
import { Fragment } from "react";
import Header from '../components/header3/HeaderServer';
import Scrollbar from "../components/scrollbar/scrollbar";
import Subscribe from '../components/Cloud-devops-components/Footer/Footer';
import Footer from "../components/data-solutions-components/Footer/Footer";

export async function generateMetadata(): Promise<Metadata> {
  let config: Awaited<ReturnType<typeof getSiteConfig>> = null;

  try {
    config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
  } catch (error) {
    console.error("Failed to load site config for layout metadata:", error);
  }

  // Base URL from environment (build‑time static, no request headers)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const canonicalUrl = baseUrl.replace(/\/$/, "");

  const siteName = config?.logoAlt || "Jobs Connect";
  const description =
    config?.ogDescription ||
    "Jobs Connect is a cutting-edge platform linking employers and professionals with career opportunities across all industries.";
  const ogTitle = config?.ogTitle || `${siteName} - Job Board & Career Opportunities Platform`;
  const ogImage = config?.ogImageUrl;
  const favicon = config?.faviconUrl || "/favicon.ico";

  return {
    title: {
      default: ogTitle,
      template: `%s | ${siteName}`,
    },
    description,
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,        // <link rel="canonical">
    },
    icons: {
      icon: favicon,
      apple: favicon,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: canonicalUrl,              // og:url
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: ogTitle }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      // url: canonicalUrl,              // twitter also uses url
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&family=Red+Hat+Display:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body id='scrool'>
        <Fragment>
          <div className='data_analytics'>
            <main className="page_content">
              <Header />
              {children}
              <Scrollbar />
            </main>
            <Subscribe />
            {/* <div
              style={{
                height: "2px",
                background:
                  "linear-gradient(to right, transparent, var(--color-primary, #1438bc), transparent)",
                opacity: 0.7,
              }}
            /> */}
            <Footer />
          </div>
        </Fragment>
        <SubscribeModalWrapper />
      </body>
    </html>
  );
}
