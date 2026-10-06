import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// import SubscribeModalWrapper from "./SubscribeModalWrapper";
import { getSiteConfig } from "@/app/actions/siteConfigAction";
import AOSInit from "@/components/AOSInit";
import Providers from "./providers";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});


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

export async function generateMetadata(): Promise<Metadata> {
  let config: Awaited<ReturnType<typeof getSiteConfig>> = null;

  try {
    config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
  } catch (error) {
    console.error("Failed to load site config for layout metadata:", error);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const canonicalUrl = baseUrl.replace(/\/$/, "");

  const siteName = config?.logoAlt || "Jobs Connect";

  const description =
    config?.ogDescription ||
    "Jobs Connect is a cutting-edge platform linking employers and professionals with career opportunities across all industries.";

  const ogTitle =
    config?.ogTitle ||
    `${siteName} - Job Board & Career Opportunities Platform`;

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
      canonical: canonicalUrl,
    },

    openGraph: {
      title: ogTitle,
      description,
      url: canonicalUrl,
      type: "website",
      images: ogImage
        ? [{ url: ogImage, alt: ogTitle }]
        : undefined,
    },

    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${playfairDisplay.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_FILTER_SCRIPT }} />
        <Providers>
          <AOSInit />

          <ErrorBoundary>
            {children}
          </ErrorBoundary>

          {/* <SubscribeModalWrapper /> */}
        </Providers>
      </body>
    </html>
  );
}