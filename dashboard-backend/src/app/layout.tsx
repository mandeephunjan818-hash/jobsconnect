import type { Metadata } from "next";
import "../styles/index.scss";
import ThemeProvider from "@/common/ThemeProvider";
import { Providers } from "./provider";
import { getSiteConfig } from "@/app/actions/siteConfigAction";

// ─── Dynamic metadata ────────────────────────────────────────
export async function generateMetadata(): Promise<Metadata> {
  let config: Awaited<ReturnType<typeof getSiteConfig>> = null;

  try {
    config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
  } catch (error) {
    console.error("Failed to load site config for layout metadata:", error);
  }

  // Base URL from environment variable (static at build time)
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
    icons: {
      icon: favicon,
      apple: favicon,
    },
    alternates: {
      canonical: canonicalUrl,   // homepage canonical link
    },
    openGraph: {
      title: ogTitle,
      description,
      url: canonicalUrl,          // og:url
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: ogTitle }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      // url: canonicalUrl,          // Twitter uses URL as well
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

// ─── Viewport (recommended by Next.js) ──────────────────────
export const viewport = {
  width: "device-width",
  initialScale: 1.0,
};

const CONSOLE_FILTER_SCRIPT = `
(function () {
  var patterns = [
    /Minified React error #418/i,
    /Hydration failed/i,
    /Failed to fetch RSC payload/i,
    /falling back to browser navigation/i,
    /Text content does not match server-rendered HTML/i,
    /A tree hydrated but some attributes/i
  ];
  function isNoisy(text) {
    try { return patterns.some(function (p) { return p.test(String(text)); }); }
    catch (e) { return false; }
  }
  function matchesArgs(args) {
    var text = Array.prototype.map.call(args, function (a) {
      return (a && a.message) ? a.message : a;
    }).join(' ');
    return isNoisy(text);
  }

  // Hide console.error / console.warn calls
  var origError = console.error;
  var origWarn = console.warn;
  console.error = function () {
    if (matchesArgs(arguments)) return;
    origError.apply(console, arguments);
  };
  console.warn = function () {
    if (matchesArgs(arguments)) return;
    origWarn.apply(console, arguments);
  };

  // Hide actual thrown/uncaught errors (e.g. React #418)
  window.addEventListener('error', function (e) {
    if (isNoisy(e.message)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && isNoisy(e.reason.message)) e.preventDefault();
  }, true);
})();
`;


// ─── Root Layout ────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_FILTER_SCRIPT }} />
        <Providers>
          <ThemeProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}