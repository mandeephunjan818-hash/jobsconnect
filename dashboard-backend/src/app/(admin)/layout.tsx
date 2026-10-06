import "../../styles/index.scss";
import ThemeProvider from "@/common/ThemeProvider";
import Script from "next/script";
import SidebarLayout from "@/components/Admin/Sidebar/Sidebar";
import { getSiteConfig } from '@/app/actions/siteConfigAction';
import { Toaster } from 'react-hot-toast';

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {


    let logoUrl: string | undefined;
    let logoAlt: string | undefined;
    try {
        const config = await getSiteConfig(process.env.NEXT_PUBLIC_SITE_ID);
        if (config) { logoUrl = config.logoUrl; logoAlt = config.logoAlt; }
    } catch { }

    return (
        <html lang="en" >
            <head>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" />

            </head>
            < body suppressHydrationWarning >
                <Toaster position="top-right" />
                <ThemeProvider />
                <SidebarLayout logoUrl={logoUrl} logoAlt={logoAlt}>
                    {children}
                </SidebarLayout>
                <Script
                    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
                    strategy="afterInteractive"
                />
            </body>
        </html>
    );
}