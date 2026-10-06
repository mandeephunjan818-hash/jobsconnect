"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import UseSticky from "@/hooks/UseSticky";
import { usePathname } from "next/navigation";

type RenderProps = {
    isOpen: boolean;
    toggleMenu: () => void;
};

interface Props {
    children: (props: RenderProps) => React.ReactNode;
    logoUrl?: string;
    logoAlt?: string;
}

export default function HeaderClientWrapper({ children, logoUrl, logoAlt }: Props) {
    const { sticky } = UseSticky();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);
    const closeMenu = useCallback(() => setIsOpen(false), []);

    // Close on route change
    useEffect(() => { closeMenu(); }, [pathname]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, closeMenu]);

    return (
        <>
            <style>{`
                /* ── Header shell ── */
                .hdr {
                    position: sticky;
                    top: 0;
                    z-index: 1030;
                    background: rgba(255,255,255,0.97);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid transparent;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .hdr.hdr--stuck {
                    border-bottom-color: #e9ecef;
                    box-shadow: 0 2px 16px rgba(0,0,0,0.07);
                }

                /* ── Inner row ── */
                .hdr__inner {
                    display: flex;
                    align-items: center;
                    height: 68px;
                    gap: 0;
                }

                /* ── Logo ── */
                .hdr__logo {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    text-decoration: none;
                    margin-right: auto;
                }
                .hdr__logo-fallback {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .hdr__logo-badge {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: #1d4ed8;
                    color: #fff;
                    font-size: 0.95rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    letter-spacing: -0.5px;
                }
                .hdr__logo-name {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #0f172a;
                    white-space: nowrap;
                    line-height: 1;
                }
                .hdr__logo-name span { color: #1d4ed8; }

                /* ── Desktop nav (centre) ── */
                .hdr__nav {
                    display: none;
                    align-items: center;
                    gap: 2px;
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                }
                @media (min-width: 992px) {
                    .hdr__nav { display: flex; }
                }

                /* ── Right cluster ── */
                .hdr__right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                    margin-left: auto;
                }

                /* ── Auth slot — desktop only ── */
                .hdr__auth {
                    display: none;
                }
                @media (min-width: 992px) {
                    .hdr__auth { display: flex; align-items: center; }
                }

                /* ── Hamburger ── */
                .hdr__burger {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    cursor: pointer;
                    color: #334155;
                    transition: background 0.15s, border-color 0.15s, color 0.15s;
                    flex-shrink: 0;
                }
                .hdr__burger:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    color: #1d4ed8;
                }
                @media (min-width: 992px) {
                    .hdr__burger { display: none; }
                }

                /* ── Backdrop ── */
                .hdr-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15,23,42,0.45);
                    backdrop-filter: blur(3px);
                    z-index: 1040;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }
                .hdr-backdrop.hdr-backdrop--open {
                    opacity: 1;
                    visibility: visible;
                }

                /* ── Drawer ── */
                .hdr-drawer {
                    position: fixed;
                    top: 0;
                    right: 0;
                    width: min(82vw, 320px);
                    height: 100dvh;
                    background: #fff;
                    z-index: 1050;
                    transform: translateX(110%);
                    transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .hdr-drawer--open {
                    transform: translateX(0);
                }

                /* drawer top bar */
                .hdr-drawer__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 1.25rem;
                    height: 64px;
                    border-bottom: 1px solid #f1f5f9;
                    flex-shrink: 0;
                }
                .hdr-drawer__title {
                    font-size: 0.85rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: #94a3b8;
                }
                .hdr-drawer__close {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.15s;
                }
                .hdr-drawer__close:hover {
                    background: #fee2e2;
                    border-color: #fca5a5;
                    color: #dc2626;
                }

                /* drawer nav */
                .hdr-drawer__nav {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.75rem 0;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .hdr-drawer__nav::-webkit-scrollbar { display: none; }

                /* drawer footer */
                .hdr-drawer__footer {
                    padding: 1rem 1.25rem;
                    border-top: 1px solid #f1f5f9;
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                /* ── Drawer nav link styles ── */
                .hdr-drawer__nav a,
                .hdr-drawer__nav .nav-link {
                    display: flex !important;
                    align-items: center;
                    gap: 0.6rem;
                    padding: 0.72rem 1.25rem !important;
                    font-size: 0.92rem !important;
                    font-weight: 500;
                    color: #1e293b !important;
                    text-decoration: none !important;
                    border-left: 3px solid transparent;
                    transition: background 0.15s, color 0.15s, border-color 0.15s, padding-left 0.15s;
                }
                .hdr-drawer__nav a:hover,
                .hdr-drawer__nav .nav-link:hover {
                    background: #f1f5f9 !important;
                    color: #1d4ed8 !important;
                    border-left-color: #1d4ed8;
                    padding-left: 1.55rem !important;
                }
                .hdr-drawer__nav a.active,
                .hdr-drawer__nav .nav-link.active {
                    background: #eff6ff !important;
                    color: #1d4ed8 !important;
                    border-left-color: #1d4ed8;
                    font-weight: 400;
                }

                /* ── Desktop nav link styles ── */
                .hdr__nav a,
                .hdr__nav .nav-link {
                    display: flex;
                    align-items: center;
                    padding: 0.4rem 0.85rem;
                    font-size: 0.88rem;
                    font-weight: 500;
                    color: #374151;
                    text-decoration: none;
                    border-radius: 8px;
                    transition: background 0.15s, color 0.15s;
                    white-space: nowrap;
                }
                .hdr__nav a:hover,
                .hdr__nav .nav-link:hover {
                    background: #f1f5f9;
                    color: #1d4ed8;
                }
                .hdr__nav a.active,
                .hdr__nav .nav-link.active {
                    background: #eff6ff;
                    color: #1d4ed8;
                    font-weight: 400;
                }

                /* ── Utility ── */
                @media (min-width: 992px) {
                    /* hide drawer-only content on desktop */
                    .hdr-drawer { display: none !important; }
                    .hdr-backdrop { display: none !important; }
                }
            `}</style>

            {/* ── Header ── */}
            <header className={`hdr${sticky ? " hdr--stuck" : ""}`}>
                <div className="container">
                    <div className="hdr__inner">

                        {/* Logo */}
                        <Link href="/" className="hdr__logo  mx-md-0 me-auto ms-0">
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
                                                        width:  150px;           
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
                                <div className="hdr__logo-fallback">
                                    <div className="hdr__logo-badge">JC</div>
                                    <span className="hdr__logo-name">
                                        Jobs<span> Connect</span>
                                    </span>
                                </div>
                            )}
                        </Link>

                        {/* Desktop centre nav */}
                        <div className="hdr__nav">
                            {children({ isOpen: false, toggleMenu })}
                        </div>

                        {/* Right cluster */}
                        <div className="hdr__right">
                            {/* Auth — desktop only */}
                            <div className="hdr__auth">
                                {children({ isOpen, toggleMenu })}
                            </div>

                            {/* Hamburger — mobile only */}
                            {/* <button
                                className="hdr__burger"
                                onClick={toggleMenu}
                                aria-label={isOpen ? "Close menu" : "Open menu"}
                                aria-expanded={isOpen}
                            >
                                <i
                                    className={`ti fs-5 ${isOpen ? "ti-x" : "ti-menu-deep"}`}
                                    style={{ lineHeight: 1 }}
                                />
                            </button> */}
                        </div>

                    </div>
                </div>
            </header>

            {/* ── Backdrop ── */}
            <div
                className={`hdr-backdrop${isOpen ? " hdr-backdrop--open" : ""}`}
                onClick={closeMenu}
                aria-hidden="true"
            />

            {/* ── Mobile drawer ── */}
            <div
                ref={menuRef}
                className={`hdr-drawer${isOpen ? " hdr-drawer--open" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                {/* Top bar */}
                <div className="hdr-drawer__top">
                    <span className="hdr-drawer__title">Menu</span>
                    <button className="hdr-drawer__close" onClick={closeMenu} aria-label="Close menu">
                        <i className="ti ti-x" style={{ fontSize: "1rem" }} />
                    </button>
                </div>

                {/* Nav links */}
                <div className="hdr-drawer__nav">
                    {children({ isOpen, toggleMenu })}
                </div>

                {/* CTA footer */}
                <div className="hdr-drawer__footer">
                    <Link
                        href="/auth/sign-in"
                        className="btn btn-outline-primary w-100"
                        style={{ fontSize: "0.88rem", borderRadius: "10px" }}
                        onClick={closeMenu}
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/auth/sign-up"
                        className="btn btn-primary w-100"
                        style={{ fontSize: "0.88rem", borderRadius: "10px" }}
                        onClick={closeMenu}
                    >
                        Post a Job
                    </Link>
                </div>
            </div>
        </>
    );
}