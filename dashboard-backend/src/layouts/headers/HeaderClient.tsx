"use client";

import Navmenu from "./Navmenu";
import AuthButtonWrapper from "./AuthButtonWrapper";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import UseSticky from "@/hooks/UseSticky";
import { usePathname } from "next/navigation";

interface Props {
    logoUrl?: string;
    logoAlt?: string;
}

export default function HeaderClient({ logoUrl, logoAlt }: Props) {
    const { sticky } = UseSticky();
    const pathname = usePathname();
    const selectedPages =
        pathname.includes("/dashboard") || pathname.includes("/listing");
    const [isOpen, setIsOpen] = useState(false);
    const toggleMenu = () => setIsOpen((prev) => !prev);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            const header = document.querySelector(".header-section");
            if (header && !header.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    return (
        <>
            <style>{`
        .bizroo-nav-drawer {
          display: none; width: 100%; background: white;
          border-top: 1px solid #f0f0f0; padding: 0.75rem 0 1rem;
        }
        .bizroo-nav-drawer.is-open { display: block; }
        @media (min-width: 992px) {
          .bizroo-nav-drawer {
            display: flex !important; width: auto; border-top: none;
            padding: 0; background: transparent; flex: 1; justify-content: center;
          }
          .bizroo-nav-drawer .navbar-nav { flex-direction: row; gap: 0.5rem; }
          .navbar-toggler { display: none !important; }
        }
        .navbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .navbar-brand { flex-shrink: 0; }
        .header-navigation { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
      `}</style>

            <header
                className={`header-section style-two px-0 ${isOpen ? "mobile-menu-open" : ""
                    } ${sticky ? "sticky-on" : ""}`}
                style={{ background: "white", backdropFilter: "blur(10px)" }}
            >
                <nav className="navbar container px-0 shadow-none">
                    {/* Logo */}
                    <Link href="/" className="navbar-brand mx-md-0 me-auto ms-0 px-0">
                        {logoUrl ? (
                            <div
                                className="logo-container"
                                style={{ position: 'relative' }}
                            >
                                <Image
                                    src={logoUrl}
                                    alt={logoAlt || 'Logo'}
                                    fill
                                    sizes="100vw"
                                    style={{
                                        objectFit: 'contain',
                                        objectPosition: 'left center',
                                    }}
                                    unoptimized={logoUrl.startsWith('http')}
                                    priority
                                />
                                {/* Responsive heights via CSS */}
                                <style jsx>
                                    {`
                                                    .logo-container {
                                                        height: 50px;          
                                                        width: 150px;           
                                                        max-width: 150px;      
                                                    }
                                                    @media (min-width: 768px) {
                                                        .logo-container {
                                                        height: 80px;
                                                        width:200px;
                                                        padding: 1
                                                        }
                                                    }
                                                    `}
                                </style>
                            </div>
                        ) : (
                            <div className="d-flex align-items-center justify-content-center me-auto" style={{ width: "fit-content" }}>
                                <div className="px-2 py-2 rounded text-white h2 fs-bold logo-icon-bg-colour">JC</div>
                                <p className="text-dark ms-3 h5 mb-0">
                                    Jobs<span className="logo-text-colour"> Connect </span>
                                </p>
                            </div>
                        )}
                    </Link>

                    {/* Nav */}
                    <div className={`bizroo-nav-drawer ${isOpen ? "is-open" : ""}`}>
                        <Navmenu
                            data={sticky}
                            isOpen={isOpen}
                            selectedPages={selectedPages}
                            currentPath={pathname}
                        />
                    </div>

                    {/* Right side: auth + hamburger */}
                    <div className="d-flex align-items-center gap-2 mx-auto w-auto">
                        <div className="header-navigation">
                            <AuthButtonWrapper isOpen={isOpen} />
                        </div>
                        {/* <button
                            className="navbar-toggler border-0 shadow-none p-1 ms-md-auto w-75"
                            type="button"
                            aria-label="Toggle navigation"
                            aria-expanded={isOpen}
                            onClick={toggleMenu}
                        >
                            <i className={`ti fs-4 text-dark ${isOpen ? "ti-x" : "ti-menu-deep"}`} />
                        </button> */}
                    </div>
                </nav>
            </header>
        </>
    );
}