import "../../../styles/index.scss";
import ThemeProvider from "@/common/ThemeProvider";
import Script from "next/script";
import HeaderTwoWrapper from "@/layouts/headers/HeaderTwoWrapper";
import SidebarLayout from "./components/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    // Optional: you can still redirect if no session, but middleware already handles it
    if (!session?.user) {
        redirect('/auth/sign-in');
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
                {/* {children} */}
                <Script
                    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
                />
            </body>
        </html>
    );
}