// components/Layout.tsx
import Link from 'next/link';
import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <>
            {/* Horizontal scrollable sub‑navbar */}
            <div className="bg-light d-none ">
                <div className="container-fluid">
                    <nav
                        className="d-flex flex-nowrap overflow-auto pt-1 pt-md-2 px-3 pe-md-3 border-bottom"
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        <Link href="/admin/siteComponents/metadata" className=" admin-subNavbar ms-lg-auto text-decoration-none px-3 border-top border-start">
                            <p className='text-info' >Meta</p>
                        </Link>
                        <Link href="/admin/siteComponents/about" className=" admin-subNavbar text-decoration-none px-3 border-top border-start">
                            <p className='text-info' >About</p>
                        </Link>
                        <Link href="/admin/siteComponents/categories" className=" admin-subNavbar text-decoration-none px-3 border-top border-start">
                            <p className='text-info' >Categories</p>
                        </Link>
                        <Link href="/admin/siteComponents/contact" className=" admin-subNavbar text-decoration-none px-3 border-top border-start">
                            <p className='text-info' >Contact</p>
                        </Link>
                        <Link href="/admin/siteComponents/blog" className=" admin-subNavbar text-decoration-none px-3 border-top border-start">
                            <p className='text-info' >Blog</p>
                        </Link>
                        <Link href="/admin/siteComponents/testimonials" className=" admin-subNavbar text-decoration-none px-3 border-top border-start">
                            <p className='text-info' >Testimonial</p>
                        </Link>
                        <Link href="/admin/siteComponents/faq" className=" admin-subNavbar text-decoration-none px-3 border-top border-start">
                            <p className='text-info' >FAQ</p>
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Main content area */}
            <main className="py-4">
                <div className="container-fluid px-0 px-md-2">{children}</div>
            </main>
        </>
    );
}