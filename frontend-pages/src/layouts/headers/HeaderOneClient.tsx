"use client";
import OffCanvas from '@/common/OffCanvas';
import menu_data from '@/data/menu-data';
import useSticky from '@/hooks/use-sticky';
import { useAuth } from '@/hooks/useAuth';
// import RightArrawIcon from '@/svg/RightArrawIcon';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface Props {
    logoUrl?: string;
    logoAlt?: string;
}

function getInitials(name?: string | null, email?: string | null): string {
    const source = (name || '').trim();
    if (source) {
        const parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
}

export default function HeaderOneClient({ logoUrl, logoAlt }: Props) {
    const { sticky } = useSticky();
    const [openMenu, setOpenMenu] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > window.innerHeight * 0.1);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // initial check
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close the user dropdown on outside click
    useEffect(() => {
        if (!userMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen]);

    const userRole = (user as { role?: string } | null | undefined)?.role;
    const isAdmin = userRole === 'admin' || userRole === 'sub-admin';
    const dashboardHref = isAdmin ? '/admin/job-bank' : '/dashboard/listings';

    return (
        <>
            <header className={`site-header luminix-header-section ${isScrolled ? 'bg-white' : "bg-white mt-0"} ${sticky ? 'sticky-menu' : ''}`} id="sticky-menu">
                <div className={`luminix-header-bottom ${isScrolled ? 'bg-white' : "bg-white"}`}>
                    <div className={`container rounded px-3 bg-white`}>
                        <div className="row gx-3 flex-nowrap align-items-center justify-content-between">
                            <div className="col-auto ">
                                <div className="header-logo1 ">
                                    <Link href="/" prefetch={false}>
                                        {logoUrl ? (
                                            <div
                                                className="logo-container"
                                                style={{ position: 'relative', width: "100px" }}
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
                                                        height: 60px;          
                                                        width: 200px;           
                                                        max-width: 200px;      
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
                                            <div className="d-flex align-items-center gap-2" style={{ width: 'fit-content' }}>
                                                <div className="px-2 py-1 rounded text-white fw-bold bg-primary" style={{ fontSize: '1.1rem', lineHeight: 1.4 }}>JC</div>
                                                <p className="text-dark mb-0 fw-semibold" style={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>
                                                    Jobs<span className="text-primary"> Connect</span>
                                                </p>
                                            </div>
                                        )}
                                    </Link>
                                </div>
                            </div>
                            <div className="col d-flex align-items-center justify-content-center position-static">
                                <div className="luminix-main-menu-items">
                                    <nav className="main-menu menu-style1 d-none d-xl-block menu-left">
                                        <ul>
                                            {menu_data.map((item, i) => (
                                                <li key={i} className={`${item.has_dropdown ? 'menu-item-has-children' : ''}`}>
                                                    <Link href={item.link} className='latter-spacing-2' prefetch={false}>{item.title}</Link>
                                                    {item.has_dropdown && (
                                                        <ul className="sub-menu">
                                                            {item?.sub_menus?.map((sub_item, sub_i) => {
                                                                if ('has_inner_dropdown' in sub_item) {
                                                                    return (
                                                                        <li key={sub_i} className={`${sub_item.has_inner_dropdown ? 'menu-item-has-children' : ''}`}>
                                                                            <Link prefetch={false} href={sub_item.link || "#"} className={`${sub_item.has_inner_dropdown ? 'no-border' : ''}`}>{sub_item.title}</Link>
                                                                            {sub_item.has_inner_dropdown && (
                                                                                <ul className="sub-menu">
                                                                                    {sub_item.sub_menus?.map((inner_sub_item, inner_sub_i) => (
                                                                                        <li key={inner_sub_i}>
                                                                                            <Link prefetch={false} href={inner_sub_item.link || "#"}>{inner_sub_item.title}</Link>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            )}
                                                                        </li>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <li key={sub_i} >
                                                                            <Link prefetch={false} href={sub_item.link || "#"}>{sub_item.title}</Link>
                                                                        </li>
                                                                    );
                                                                }
                                                            })}
                                                        </ul>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                            <div className="col-auto d-flex align-items-center p-0">
                                <div className="luminix-header-info-wraper2 d-flex align-items-center gap-2">
                                    {isLoading ? (
                                        // Reserve space while the session resolves to avoid a flash of the wrong state
                                        <div
                                            className="d-sm-block d-none"
                                            style={{ width: 96, height: 36, borderRadius: 50, background: '#f0f0f0' }}
                                        />
                                    ) : isAuthenticated ? (
                                        <>
                                            <Link
                                                href={dashboardHref}
                                                className="luminix-default-btn pill button-custom d-sm-flex d-none"
                                                style={{ color: '#fff' }}
                                            >
                                                Dashboard
                                            </Link>

                                            <div ref={userMenuRef} style={{ position: 'relative' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setUserMenuOpen(v => !v)}
                                                    aria-haspopup="true"
                                                    aria-expanded={userMenuOpen}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        background: 'transparent',
                                                        border: '1px solid #e6e8ef',
                                                        borderRadius: 50,
                                                        padding: '4px 10px 4px 4px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {user?.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={user.image}
                                                            alt={user.name || 'Account'}
                                                            width={28}
                                                            height={28}
                                                            style={{ borderRadius: '50%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <span
                                                            style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                background: 'var(--accent-color, #6c3fcf)',
                                                                color: '#fff',
                                                            }}
                                                        >
                                                            {getInitials(user?.name, user?.email)}
                                                        </span>
                                                    )}
                                                    <span
                                                        className="d-none d-md-inline"
                                                        style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1c2233', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                    >
                                                        {user?.name || user?.email}
                                                    </span>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8791a3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M6 9l6 6 6-6" />
                                                    </svg>
                                                </button>

                                                {userMenuOpen && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: 'calc(100% + 8px)',
                                                            right: 0,
                                                            minWidth: 200,
                                                            background: '#fff',
                                                            borderRadius: 12,
                                                            border: '1px solid #eef0f5',
                                                            boxShadow: '0 10px 32px rgba(20,20,43,0.12)',
                                                            overflow: 'hidden',
                                                            zIndex: 50,
                                                        }}
                                                    >
                                                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f2f6' }}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1c2233', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {user?.name || 'Your account'}
                                                            </div>
                                                            {user?.email && (
                                                                <div style={{ fontSize: '0.75rem', color: '#8791a3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {user.email}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Link
                                                            href={dashboardHref}
                                                            prefetch={false}
                                                            onClick={() => setUserMenuOpen(false)}
                                                            style={{ display: 'block', padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#3a4256', textDecoration: 'none' }}
                                                        >
                                                            Dashboard
                                                        </Link>
                                                        <Link
                                                            href="/dashboard/listings"
                                                            prefetch={false}
                                                            onClick={() => setUserMenuOpen(false)}
                                                            style={{ display: 'block', padding: '10px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#3a4256', textDecoration: 'none' }}
                                                        >
                                                            Post a Job
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setUserMenuOpen(false);
                                                                logout('/');
                                                            }}
                                                            style={{
                                                                display: 'block',
                                                                width: '100%',
                                                                textAlign: 'left',
                                                                padding: '10px 16px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 600,
                                                                color: '#e64848',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                borderTop: '1px solid #f0f2f6',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Log out
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                href="/auth/sign-in"
                                                prefetch={false}
                                                className="d-sm-flex d-none"
                                                style={{ fontSize: '0.9rem', fontWeight: 600, color: '#3a4256', textDecoration: 'none', padding: '8px 6px' }}
                                            >
                                                Login
                                            </Link>
                                            <Link
                                                href="/auth/sign-in?callbackUrl=%2Fdashboard%2Flistings"
                                                prefetch={false}
                                                className="luminix-default-btn pill button-custom d-sm-flex d-none"
                                                style={{ color: '#fff' }}
                                            >
                                                Post Job
                                            </Link>
                                        </>
                                    )}
                                </div>
                                <div className="luminix-header-menu">
                                    <nav className="navbar site-navbar justify-content-between">
                                        <button className="luminix-menu-toggle d-inline-block d-xl-none" onClick={() => setOpenMenu(!openMenu)}>
                                            <span></span>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <OffCanvas setOpenMenu={setOpenMenu} openMenu={openMenu} logoUrl={logoUrl} logoAlt={logoAlt} />
        </>
    );
}