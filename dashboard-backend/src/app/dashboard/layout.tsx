import type { Metadata } from "next";
import "../../styles/index.scss";
import ThemeProvider from "@/common/ThemeProvider";
import Script from "next/script";
import HeaderTwoWrapper from "@/layouts/headers/HeaderTwoWrapper";
import SidebarLayout from "./components/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSiteConfig } from "@/app/actions/siteConfigAction";

// ─── Dynamic metadata ────────────────────────────────────────
export async function generateMetadata(): Promise<Metadata> {
    let config: Awaited<ReturnType<typeof getSiteConfig>> = null;

    try {
        config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
    } catch (error) {
        console.error("Failed to load site config for layout metadata:", error);
    }

    // Static base URL (no headers, build-time from env)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const canonicalUrl = baseUrl.replace(/\/$/, ""); // e.g. "https://example.com"

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
            canonical: canonicalUrl,        // homepage canonical
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
            // url: canonicalUrl,              // twitter also supports url
            images: ogImage ? [{ url: ogImage }] : undefined,
        },
    };
}

// ─── Viewport ─────────────────────────────────────────────────
export const viewport = {
    width: "device-width",
    initialScale: 1.0,
};

// ─── Root Layout (protected) ──────────────────────────────────
export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/sign-in");
    }

    return (
        <html lang="en">
            <head>
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
                />
            </head>
            <body suppressHydrationWarning className="mt-5 mt-md-auto" style={{ background: "#f8fafc" }}>
                <ThemeProvider />
                <HeaderTwoWrapper />
                <SidebarLayout>{children}</SidebarLayout>
                <Script
                    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
                />
            </body>
        </html>
    );
}