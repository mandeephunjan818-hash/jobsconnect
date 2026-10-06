// components/SidebarLayout.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useLayoutEffect } from 'react';
import {
    BsBoxArrowRight,
    BsChevronLeft,
    BsChevronRight,
    BsCreditCard2Front,
    BsWallet2,
    BsClockHistory,
} from 'react-icons/bs';

interface SidebarLayoutProps {
    children: ReactNode;
}

interface SidebarContentProps {
    collapsed: boolean;
    redirectTo?: string;
    bottomRef?: React.RefObject<HTMLDivElement | null>;
    isOffcanvas?: boolean;
}

const SidebarContent = ({
    collapsed,
    redirectTo = '/auth/sign-in',
    bottomRef,
    isOffcanvas = false,
}: SidebarContentProps) => {
    const pathname = usePathname() ?? '';
    const { logout, isLoading } = useAuth();

    const handleLogout = async () => {
        await logout(redirectTo);
    };

    const navItems = [
        { href: '/dashboard/wallet-payments/credits', icon: BsCreditCard2Front, label: 'Credits' },
        { href: '/dashboard/wallet-payments/wallet', icon: BsWallet2, label: 'Wallet' },
        { href: '/dashboard/wallet-payments/activity', icon: BsClockHistory, label: 'Activity History' },
    ];

    return (
        <div className="d-flex flex-column h-100">
            {/* Navigation */}
            {/* <nav className="nav flex-column flex-grow-1 px-2 pt-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.endsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href as Route}
                            data-bs-dismiss={isOffcanvas ? 'offcanvas' : undefined}
                            className={`
                                sidebar-nav-item d-flex align-items-center rounded-3 mb-1 transition-all
                                ${collapsed ? 'justify-content-center px-2' : 'px-3'}
                                ${isActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
                            `}
                            style={{
                                paddingTop: '0.7rem',
                                paddingBottom: '0.7rem',
                                fontSize: collapsed ? '1.3rem' : '0.95rem',
                                fontWeight: isActive ? 500 : 400,
                            }}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={collapsed ? '' : 'me-3'} size={collapsed ? 22 : 18} />
                            {!collapsed && <span className="text-capitalize">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav> */}

            {/* Bottom Actions */}
            <div
                ref={bottomRef}
                className="sidebar-bottom-actions"
                style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}
            >
                <div className={`sidebar-bottom-buttons ${collapsed ? 'collapsed' : ''}`}>
                    <button
                        className="sidebar-action-btn sidebar-logout-btn"
                        onClick={handleLogout}
                        disabled={isLoading}
                        title={collapsed ? 'Logout' : undefined}
                    >
                        <BsBoxArrowRight className="sidebar-action-icon" />
                        {!collapsed && <span className="sidebar-action-text">Logout</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function SidebarLayout({ children }: SidebarLayoutProps) {
    const [collapsed, setCollapsed] = useState(false); // expanded by default
    const bottomActionsRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);
    const [toggleBottom, setToggleBottom] = useState(120);

    const toggleCollapse = () => setCollapsed(!collapsed);

    useLayoutEffect(() => {
        const updatePosition = () => {
            if (bottomActionsRef.current && sidebarRef.current) {
                const sidebarRect = sidebarRef.current.getBoundingClientRect();
                const bottomRect = bottomActionsRef.current.getBoundingClientRect();
                const distanceFromBottom =
                    sidebarRect.bottom - (bottomRect.top + bottomRect.height / 2);
                setToggleBottom(distanceFromBottom);
            }
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [collapsed]);

    return (
        <>
            <style jsx global>{`
                /* Smooth, rounded, purple‑friendly theme */
                .sidebar-transition {
                    transition: width 0.25s ease-in-out;
                }
                .transition-all {
                    transition: all 0.2s ease;
                }

                /* Nav items */
                .sidebar-nav-item {
                    color: rgba(255, 255, 255, 0.85); /* soft white */
                    text-decoration: none;
                }
                .sidebar-nav-inactive:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                }
                .sidebar-nav-active {
                    background: rgba(255, 255, 255, 0.18);
                    color: #ffffff !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }

                /* Bottom area */
                .sidebar-bottom-actions {
                    margin-top: auto;
                    padding: 0.5rem;
                }
                .sidebar-bottom-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .sidebar-bottom-buttons.collapsed {
                    align-items: center;
                }
                .sidebar-action-btn {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 0.7rem 1rem;
                    background: transparent;
                    border: none;
                    border-radius: 0.5rem;
                    color: rgba(255, 255, 255, 0.75);
                    font-size: 0.95rem;
                    font-weight: 400;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .sidebar-bottom-buttons.collapsed .sidebar-action-btn {
                    justify-content: center;
                    padding: 0.7rem;
                    width: auto;
                }
                .sidebar-action-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                }
                .sidebar-logout-btn {
                    color: #fca5a5; /* soft red */
                }
                .sidebar-logout-btn:hover {
                    background-color: rgba(252, 165, 165, 0.2);
                    color: #fecaca;
                }
                .sidebar-action-icon {
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }
                .sidebar-bottom-buttons:not(.collapsed) .sidebar-action-icon {
                    margin-right: 0.75rem;
                }
                .sidebar-action-text {
                    white-space: nowrap;
                }

                /* Toggle button (matches gradient) */
                .toggle-button {
                    position: absolute;
                    right: -14px;
                    width: 28px;
                    height: 28px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    color: rgba(255, 255, 255, 0.8);
                    z-index: 100;
                    cursor: pointer;
                    transition: all 0.2s;
                    transform: translateY(-50%);
                }
                .toggle-button:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.4);
                    color: #ffffff;
                }
                .sidebar-container {
                    position: relative;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Mobile bottom navbar (only on small screens) */}
            {/* <nav
                className="navbar position-fixed bottom-0 navbar-light border-bottom d-md-none w-100"
                style={{
                    zIndex: 15,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                }}
            >
                <div className="container-fluid">
                    <button
                        className="navbar-toggler border-0"
                        type="button"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#offcanvasSidebar"
                        aria-controls="offcanvasSidebar"
                    >
                        <span className="navbar-toggler-icon" />
                    </button>
                </div>
            </nav> */}

            {/* Flex row: Sidebar + Main */}
            <div className="d-flex flex-grow-1 mt-4">
                {/* Desktop Sidebar */}
                {/* <aside
                    ref={sidebarRef}
                    className={`d-none d-md-block sidebar-transition sidebar-container no-scrollbar ${collapsed ? 'sidebar-collapsed' : ''
                        }`}
                    style={{
                        width: collapsed ? '80px' : '250px',
                        minWidth: collapsed ? '80px' : '250px',
                        height: '80vh',
                        overflowY: 'auto',
                        overflowX: 'visible',
                        boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
                        borderRight: '1px solid rgba(255,255,255,0.15)',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', // your purple gradient
                        borderRadius: '16px',   // rounded right side
                        position: 'relative',
                    }}
                >
                    <SidebarContent collapsed={collapsed} bottomRef={bottomActionsRef} />

                    <button
                        onClick={toggleCollapse}
                        className="toggle-button"
                        style={{ bottom: toggleBottom }}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? (
                            <BsChevronRight size={14} />
                        ) : (
                            <BsChevronLeft size={14} />
                        )}
                    </button>
                </aside> */}

                {/* Main Content */}
                <main className="flex-grow-1 d-flex flex-column">
                    <div className="">{children}</div>
                </main>
            </div>

            {/* Mobile Offcanvas Sidebar */}
            {/* <div
                className="offcanvas offcanvas-start"
                tabIndex={-1}
                id="offcanvasSidebar"
                aria-labelledby="offcanvasSidebarLabel"
                style={{
                    width: '280px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                }}
            >
                <div className="offcanvas-header border-bottom border-white border-opacity-25">
                    <h5 className="offcanvas-title text-white" id="offcanvasSidebarLabel">
                        Menu
                    </h5>
                    <button
                        type="button"
                        className="btn-close btn-close-white"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    />
                </div>
                <div className="offcanvas-body p-0">
                    <SidebarContent collapsed={false} />
                </div>
            </div> */}
        </>
    );
}