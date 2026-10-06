// components/SidebarLayout.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useLayoutEffect, useEffect } from 'react';
import {
  BsPeople,
  BsBoxArrowRight,
  BsChevronLeft,
  BsChevronRight,
  BsChevronUp,
  BsChevronDown,
  BsListUl,
  BsFileCode,
  BsTags,
  BsTelephone,
  BsFilePost,
  BsStarHalf,
  BsQuestionCircle,
  BsEnvelopeFill,
  BsBank
} from 'react-icons/bs';
import { BsCreditCard } from 'react-icons/bs';
import { FaRegUser } from "react-icons/fa";
import { CgPlayListAdd } from "react-icons/cg";
import { Route } from 'next';
import { IoSettingsOutline } from "react-icons/io5";
import { IoDocumentTextOutline } from "react-icons/io5";
import Image from 'next/image';
import { PERMISSIONS, type Permission } from '@/config/permissions';
// import { SiSubstack } from "react-icons/si";

interface SidebarLayoutProps {
  children: ReactNode;
  logoUrl?: string;
  logoAlt?: string;
}

interface SidebarContentProps {
  collapsed: boolean;
  redirectTo?: string;
  bottomRef?: React.RefObject<HTMLDivElement | null>;
  logoUrl?: string;
  logoAlt?: string;
}

const listingsSubLinks = [
  { href: '/admin/listings', label: 'All Listings', icon: BsListUl, permissions: [PERMISSIONS.LISTINGS_LIST] as Permission[] },
  { href: '/admin/listings/edit/new', label: 'Add Listing', icon: CgPlayListAdd, permissions: [PERMISSIONS.LISTINGS_CREATE] as Permission[] },
  { href: '/admin/job-bank', label: 'Job Bank Requests', icon: BsBank, permissions: [PERMISSIONS.JOB_BANK_REQUESTS_LIST] as Permission[] },
];

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: any;
  permissions: Permission[] | null;
}[] = [
    {
      href: '/admin/categories',
      label: 'Categories',
      icon: BsTags,
      permissions: [PERMISSIONS.SERVICES_LIST]
    },
    { href: '/admin/employer-management', icon: BsPeople, label: 'Employer Management', permissions: [PERMISSIONS.USERS_LIST] },
    { href: '/admin/job-applications', label: 'Job Applications', icon: IoDocumentTextOutline, permissions: [PERMISSIONS.JOB_BANK_REQUESTS_LIST] },
    { href: '/admin/contact', label: 'Inquiry', icon: BsTelephone, permissions: [PERMISSIONS.CONTACT_LIST] },
    { href: '/admin/blog', label: 'Blog', icon: BsFilePost, permissions: [PERMISSIONS.BLOG_LIST] },
    { href: '/admin/meta', label: 'Meta', icon: BsFileCode, permissions: [PERMISSIONS.METADATA_LIST] },
    { href: '/admin/testimonials', label: 'Testimonial', icon: BsStarHalf, permissions: [PERMISSIONS.TESTIMONIALS_LIST] },
    { href: '/admin/faq', label: 'FAQ', icon: BsQuestionCircle, permissions: [PERMISSIONS.FAQ_LIST] },
    { href: '/admin/subscribers', label: 'Subscribers', icon: BsEnvelopeFill, permissions: [PERMISSIONS.SUBSCRIBERS_LIST] },
    { href: '/admin/users', icon: FaRegUser, label: 'Users', permissions: [PERMISSIONS.USERS_LIST] },
    { href: '/admin/credits/create', icon: BsCreditCard, label: 'Credit Bundles', permissions: [PERMISSIONS.CREADITS_LIST] },
    { href: '/admin/credits/list', icon: BsCreditCard, label: 'Credit Purchases', permissions: [PERMISSIONS.CREADITS_LIST] },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: IoSettingsOutline,
      permissions: [PERMISSIONS.SITECONFIG_LIST]
    },
  ];

const LISTINGS_INJECT_AFTER_INDEX = 1;

const LISTINGS_GROUP_PERMISSIONS: Permission[] = [
  PERMISSIONS.LISTINGS_LIST,
  PERMISSIONS.LISTINGS_CREATE,
  PERMISSIONS.CREATE_CREATE,
  PERMISSIONS.JOB_BANK_REQUESTS_LIST,
];

function hasAnyPermission(userPermissions: Permission[], required: Permission[] | null): boolean {
  if (required === null) return true;
  if (!userPermissions || userPermissions.length === 0) return false;
  return required.some(p => userPermissions.includes(p));
}

const SidebarContent = ({
  collapsed,
  redirectTo = '/auth/admin-sign-in',
  bottomRef,
  logoUrl,
  logoAlt
}: SidebarContentProps) => {
  const pathname = usePathname() ?? '';
  const { logout, isLoading } = useAuth();
  const { data: session } = useSession();
  const [listingsOpen, setListingsOpen] = useState(false);
  const [collapsedListingsOpen, setCollapsedListingsOpen] = useState(false);
  const [collapsedSubOpen, setCollapsedSubOpen] = useState(false);

  const handleLogout = async () => {
    await logout(redirectTo);
  };

  const userPermissions = (session?.user?.permissions ?? []) as Permission[];

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!hasAnyPermission(userPermissions, item.permissions)) return false;
    if (item.href === '/admin/users' && session?.user?.role === 'sub-admin') {
      return false;
    }
    return true;
  });

  const visibleListingsSubLinks = listingsSubLinks.filter(link => hasAnyPermission(userPermissions, link.permissions));
  const showListingsGroup = hasAnyPermission(userPermissions, LISTINGS_GROUP_PERMISSIONS) && visibleListingsSubLinks.length > 0;

  const isListingsActive = visibleListingsSubLinks.some(
    (link) => pathname === link.href || pathname.startsWith(link.href + '/')
  );

  useEffect(() => {
    setCollapsedSubOpen(false);
    setCollapsedListingsOpen(false);
  }, [pathname]);

  const anchorItem = NAV_ITEMS[LISTINGS_INJECT_AFTER_INDEX];
  const anchorIsVisible = visibleNavItems.some(i => i.href === anchorItem.href);

  return (
    <div className="d-flex flex-column" style={{ height: '100%', overflow: 'hidden' }}>
      {/* Logo */}
      <div className={`text-center admin-logo-style py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <Link href="/" className="d-block">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={logoAlt || 'Logo'}
              width={160}
              height={48}
              style={{
                objectFit: 'contain',
                objectPosition: 'center',
                maxWidth: collapsed ? '36px' : '120px',
                maxHeight: collapsed ? '50px' : '70px',
                width: 'auto',
                height: 'auto',
                transition: 'max-width 0.25s ease-in-out, max-height 0.25s ease-in-out',
              }}
              unoptimized={logoUrl.startsWith('http')}
              priority
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '40px' }}>
              <div
                className="rounded text-white fw-bold logo-icon-bg-colour d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '34px', height: '34px', fontSize: '0.95rem' }}
              >
                JC
              </div>
              {!collapsed && (
                <p className="text-white ms-2 mb-0 fw-semibold" style={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                  Jobs<span className="logo-text-colour"> Connect</span>
                </p>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="nav px-2 no-scrollbar"
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: '1 1 0',
          minHeight: 0,
          width: '100%',
        }}
      >
        <div className="w-100 d-flex flex-column">
          {showListingsGroup && !anchorIsVisible && (
            <ListingsGroup
              collapsed={collapsed}
              isListingsActive={isListingsActive}
              listingsOpen={listingsOpen}
              setListingsOpen={setListingsOpen}
              collapsedListingsOpen={collapsedListingsOpen}
              setCollapsedListingsOpen={setCollapsedListingsOpen}
              visibleListingsSubLinks={visibleListingsSubLinks}
              pathname={pathname}
            />
          )}

          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            const isAnchor = showListingsGroup && anchorIsVisible && item.href === anchorItem.href;

            if (isAnchor) {
              return (
                <div key={item.href}>
                  <ListingsGroup
                    collapsed={collapsed}
                    isListingsActive={isListingsActive}
                    listingsOpen={listingsOpen}
                    setListingsOpen={setListingsOpen}
                    collapsedListingsOpen={collapsedListingsOpen}
                    setCollapsedListingsOpen={setCollapsedListingsOpen}
                    visibleListingsSubLinks={visibleListingsSubLinks}
                    pathname={pathname}
                  />
                  <Link
                    href={item.href as Route}
                    className={`
                  sidebar-nav-item d-flex align-items-center rounded-3 mb-1 transition-all
                  ${collapsed ? 'justify-content-center px-2' : 'px-3'}
                  ${isActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
                `}
                    style={{
                      width: '100%',
                      flexShrink: 0,
                      paddingTop: '0.55rem',
                      paddingBottom: '0.55rem',
                      fontSize: collapsed ? '1rem' : '0.76rem',
                      fontWeight: isActive ? 500 : 400,
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={collapsed ? '' : 'me-2'} size={collapsed ? 18 : 15} />
                    {!collapsed && <span className="text-capitalize">{item.label}</span>}
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={`
                  sidebar-nav-item d-flex align-items-center rounded-3 mb-1 transition-all
                  ${collapsed ? 'justify-content-center px-2' : 'px-3'}
                  ${isActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
                `}
                style={{
                  width: '100%',
                  flexShrink: 0,
                  paddingTop: '0.55rem',
                  paddingBottom: '0.55rem',
                  fontSize: collapsed ? '1rem' : '0.76rem',
                  fontWeight: isActive ? 500 : 400,
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={collapsed ? '' : 'me-2'} size={collapsed ? 18 : 15} />
                {!collapsed && <span className="text-capitalize">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div
        ref={bottomRef}
        className="sidebar-bottom-actions"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className={`sidebar-bottom-buttons ${collapsed ? 'collapsed' : ''}`}>
          <button
            className="sidebar-action-btn sidebar-logout-btn bg-danger text-white "
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

// ─── Extracted Listings dropdown group ────────────────────────────────────────

interface ListingsGroupProps {
  collapsed: boolean;
  isListingsActive: boolean;
  listingsOpen: boolean;
  setListingsOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  collapsedListingsOpen: boolean;
  setCollapsedListingsOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  visibleListingsSubLinks: typeof listingsSubLinks;
  pathname: string;
}

function ListingsGroup({
  collapsed,
  isListingsActive,
  listingsOpen,
  setListingsOpen,
  collapsedListingsOpen,
  setCollapsedListingsOpen,
  visibleListingsSubLinks,
  pathname,
}: ListingsGroupProps) {
  if (collapsed) {
    return (
      <div>
        <button
          onClick={() => setCollapsedListingsOpen(o => !o)}
          className={`
            sidebar-nav-item d-flex align-items-center rounded-3 mb-1 transition-all w-100
            justify-content-center px-2
            ${isListingsActive || collapsedListingsOpen ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
          `}
          style={{
            width: '100%',
            flexShrink: 0,
            paddingTop: '0.55rem',
            paddingBottom: '0.55rem',
            fontSize: '1rem',
            fontWeight: isListingsActive ? 500 : 400,
            border: 'none',
            background: '#7c3aed24', // ✅ purple transparent
          }}
          title="Listings"
        >
          <BsListUl size={18} />
        </button>

        {collapsedListingsOpen && (
          <div className="mt-1 mb-2 d-flex flex-column align-items-center gap-1">
            {visibleListingsSubLinks.map((link) => {
              const isSubActive =
                pathname === link.href || pathname.startsWith(link.href + '/');
              const SubIcon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  onClick={() => setCollapsedListingsOpen(false)}
                  title={link.label}
                  className={`
                    sidebar-nav-item d-flex align-items-center justify-content-center rounded-3 transition-all
                    ${isSubActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
                  `}
                  style={{
                    width: '36px',
                    height: '32px',
                    flexShrink: 0,
                  }}
                >
                  <SubIcon size={14} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setListingsOpen(o => !o)}
        className={`
          sidebar-nav-item d-flex align-items-center rounded-3 mb-1 transition-all w-100
          px-3
          ${isListingsActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
        `}
        style={{
          flexShrink: 0,
          paddingTop: '0.55rem',
          paddingBottom: '0.55rem',
          fontSize: '0.76rem',
          fontWeight: isListingsActive ? 500 : 400,
          border: 'none',
          textAlign: 'left',
          background: '#7c3aed24', // ✅ purple transparent
        }}
      >
        <BsListUl className="me-2" size={15} />
        <span className="text-capitalize flex-grow-1">Listings</span>
        {listingsOpen ? (
          <BsChevronUp size={14} />
        ) : (
          <BsChevronDown size={14} />
        )}
      </button>

      {listingsOpen && (
        <div className="ms-3 ps-3 border-start border-2 mt-1 mb-2" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          {visibleListingsSubLinks.map((link) => {
            const isSubActive =
              pathname === link.href || pathname.startsWith(link.href + '/');
            const SubIcon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href as Route}
                className={`
                  sidebar-nav-item d-flex align-items-center rounded-3 mb-1 transition-all
                  px-3 py-2
                  ${isSubActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
                `}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: isSubActive ? 500 : 400,
                }}
              >
                <SubIcon className="me-2 flex-shrink-0" size={13} />
                <span
                  className="text-capitalize"
                  style={isSubActive ? { color: 'white' } : { color: 'rgba(255,255,255,0.8)' }}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function SidebarLayout({ children, logoUrl, logoAlt }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
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
        .sidebar-transition {
          transition: width 0.25s ease-in-out;
        }
        .transition-all {
          transition: all 0.2s ease;
        }

        .sidebar-nav-item {
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
        }

        /* ✅ Updated hover: soft violet tint */
        .sidebar-nav-inactive:hover {
          background-color: rgba(167, 139, 250, 0.2);
          color: #ffffff;
        }

        /* ✅ Updated active: subtle white overlay + left accent */
        .sidebar-nav-active {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff !important;
          box-shadow: none;
        }

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
          padding: 0.55rem 0.8rem;
          background: transparent;
          border: none;
          border-radius: 0.5rem;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.76rem;
          font-weight: 400;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sidebar-bottom-buttons.collapsed .sidebar-action-btn {
          justify-content: center;
          padding: 0.55rem;
          width: auto;
        }
        .sidebar-action-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .sidebar-logout-btn {
          color: #ff8a8a;
        }
        .sidebar-logout-btn:hover {
          background-color: rgba(255, 138, 138, 0.15);
          color: #ffb3b3;
        }

        .sidebar-action-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }
        .sidebar-bottom-buttons:not(.collapsed) .sidebar-action-icon {
          margin-right: 0.6rem;
        }
        .sidebar-action-text {
          white-space: nowrap;
        }

        .toggle-button {
          position: absolute;
          right: -14px;
          width: 28px;
          height: 28px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          color: #2c3e50;
          z-index: 100;
          cursor: pointer;
          transition: all 0.2s;
          transform: translateY(-50%);
        }

        /* ✅ Updated toggle hover: purple accent */
        .toggle-button:hover {
          background: #f8f9fa;
          border-color: #7c3aed;
          color: #7c3aed;
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

        .sidebar-nav-item.sidebar-nav-active {
          color: white !important;
        }
      `}</style>

      <div className="d-flex flex-column min-vh-100">
        {/* ✅ Mobile Navbar – now purple gradient */}
        <nav
          className="navbar navbar-dark d-md-none"
          style={{ background: '#5b50e1' }}
        >
          <div className="container-fluid">
            <Link href="/" className="navbar-brand admin-logo-style">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={logoAlt || 'Logo'}
                  width={160}
                  height={48}
                  style={{
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    maxWidth: '120px',
                    maxHeight: '70px',
                    width: 'auto',
                    height: 'auto',
                  }}
                  unoptimized={logoUrl.startsWith('http')}
                  priority
                />
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded text-white fw-bold logo-icon-bg-colour d-flex align-items-center justify-content-center"
                    style={{ width: '34px', height: '34px', fontSize: '0.95rem', flexShrink: 0 }}
                  >
                    JC
                  </div>
                  <p className="text-white mb-0 fw-semibold" style={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                    Jobs<span className="logo-text-colour"> Connect</span>
                  </p>
                </div>
              )}
            </Link>
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
        </nav>

        <div className="d-flex flex-grow-1">
          {/* ✅ Desktop Sidebar – purple gradient */}
          <aside
            ref={sidebarRef}
            className={`d-none d-md-block sidebar-transition sidebar-container no-scrollbar ${collapsed ? 'sidebar-collapsed' : ''
              }`}
            style={{
              width: collapsed ? '64px' : '250px',
              minWidth: collapsed ? '64px' : '250px',
              height: '100vh',
              overflow: 'hidden',
              boxShadow: '2px 0 12px rgba(0,0,0,0.03)',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              background: '#5b50e1',
              position: 'sticky',
              top: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SidebarContent collapsed={collapsed} bottomRef={bottomActionsRef} logoUrl={logoUrl} logoAlt={logoAlt} />

            <button
              onClick={toggleCollapse}
              className="toggle-button"
              style={{
                bottom: toggleBottom,
                position: 'absolute',
                right: '-14px',
                zIndex: 10,
              }}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <BsChevronRight size={14} /> : <BsChevronLeft size={14} />}
            </button>
          </aside>

          {/* Main Content */}
          <main className="flex-grow-1 p-0 p-md-4 min-vh-100 max-vh-100 vh-100 overflow-auto d-flex flex-column" style={{ background: '#f3f4f8' }}>
            <div className="mb-3">{children}</div>
            <footer className="bg-white text-dark text-center py-3 mt-auto">
              <p className="mb-0 small text-muted">
                © {new Date().getFullYear()} Jobs Connect. All rights reserved.
              </p>
            </footer>
          </main>
        </div>

        {/* ✅ Offcanvas Mobile Sidebar – purple gradient */}
        <div
          className="offcanvas offcanvas-start"
          tabIndex={-1}
          id="offcanvasSidebar"
          aria-labelledby="offcanvasSidebarLabel"
          style={{ width: '280px', background: '#5b50e1' }}
        >
          <div className="offcanvas-body p-0">
            <SidebarContent collapsed={false} logoUrl={logoUrl} logoAlt={logoAlt} />
          </div>
        </div>
      </div>
    </>
  );
}