'use client';

import { useAuth } from '@/hooks/useAuth';
import { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    BsListUl,
    BsBoxArrowRight,
    BsChevronLeft,
    BsChevronRight,
    BsChevronDown,
    BsChevronUp,
    BsCreditCard2Front,
    BsWallet2,
    BsClockHistory,
    BsWalletFill,
    BsKeyFill,
    BsInboxFill,
} from 'react-icons/bs';
import { MdOutlinePlaylistAdd } from 'react-icons/md';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarLayoutProps {
    children: ReactNode;
}

interface SidebarContentProps {
    collapsed: boolean;
    redirectTo?: string;
    bottomRef?: React.RefObject<HTMLDivElement | null>;
    onClose?: () => void;
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    {
        href: '/dashboard/listings',
        icon: BsListUl,
        label: 'Listings',
    },
    {
        href: '/dashboard/job-bank',
        icon: MdOutlinePlaylistAdd,
        label: 'Listing Requests',
        children: [
            { href: '/dashboard/job-bank', icon: MdOutlinePlaylistAdd, label: 'Submit a request', exact: true },
            { href: '/dashboard/job-bank/requests', icon: BsInboxFill, label: 'All requests' },
        ],
    },
    {
        href: '/dashboard/wallet-payments',
        icon: BsWalletFill,
        label: 'Wallet & Payments',
        children: [
            { href: '/dashboard/wallet-payments/wallet', icon: BsWallet2, label: 'Wallet' },
            { href: '/dashboard/wallet-payments/credits', icon: BsCreditCard2Front, label: 'Credits' },
            { href: '/dashboard/wallet-payments/activity', icon: BsClockHistory, label: 'Activity History' },
        ],
    },
];

// ─── Profile header ───────────────────────────────────────────────────────────

function ProfileSection({
    collapsed,
    onPasswordReset,
}: {
    collapsed: boolean;
    onPasswordReset: () => void;
}) {
    const { data: session } = useSession();
    const name = session?.user?.name || 'User';
    const email = session?.user?.email || '';
    const initials = name.charAt(0).toUpperCase();

    return (
        <div
            style={{
                padding: collapsed ? '1rem 0.5rem' : '1.25rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                transition: 'padding 0.25s ease',
            }}
        >
            {collapsed ? (
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        border: '2px solid rgba(255,255,255,0.35)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                    }}
                >
                    {initials}
                </div>
            ) : (
                <div className="d-flex align-items-center gap-3">
                    <div
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            border: '2px solid rgba(255,255,255,0.35)',
                            color: '#fff',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, overflow: 'visible' }}>
                        <p
                            className="mb-0"
                            style={{
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                color: '#fff',
                                lineHeight: 1.3,
                                wordBreak: 'break-word',
                            }}
                        >
                            {name}
                        </p>
                        <p
                            className="mb-0"
                            style={{
                                fontSize: '0.72rem',
                                color: 'rgba(255,255,255,0.6)',
                                lineHeight: 1.3,
                                wordBreak: 'break-word',
                            }}
                        >
                            {email}
                        </p>
                    </div>
                    {/* <button
                        onClick={onPasswordReset}
                        title="Change password"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        <BsKeyFill size={14} />
                    </button> */}
                </div>
            )}
        </div>
    );
}

// ─── Password reset modal ─────────────────────────────────────────────────────

function PasswordResetModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState<'otp' | 'password'>('otp');
    const [otp, setOtp] = useState('');
    const [token, setToken] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const sendOtp = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'change' }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMsg({ type: 'error', text: data.error || 'Failed to send OTP' });
            } else {
                setMsg({ type: 'success', text: 'OTP sent to your email.' });
            }
        } catch {
            setMsg({ type: 'error', text: 'Network error.' });
        } finally {
            setSending(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) { setMsg({ type: 'error', text: 'Enter the OTP.' }); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, type: 'change' }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMsg({ type: 'error', text: data.error || 'Invalid OTP' });
            } else {
                setToken(data.actionToken);
                setStep('password');
                setMsg(null);
            }
        } catch {
            setMsg({ type: 'error', text: 'Verification failed.' });
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async () => {
        if (newPass !== confirm) { setMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
        if (newPass.length < 8) { setMsg({ type: 'error', text: 'Min 8 characters.' }); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionToken: token, newPassword: newPass }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMsg({ type: 'error', text: data.error || 'Failed.' });
            } else {
                setMsg({ type: 'success', text: 'Password changed successfully!' });
                setTimeout(onClose, 1500);
            }
        } catch {
            setMsg({ type: 'error', text: 'Network error.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#fff', borderRadius: '16px', padding: '2rem',
                width: '100%', maxWidth: '400px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}>
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h5 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>
                        {step === 'otp' ? 'Verify Identity' : 'New Password'}
                    </h5>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                            background: '#f8fafc', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#64748b',
                        }}
                    >✕</button>
                </div>

                {msg && (
                    <div style={{
                        padding: '0.65rem 0.9rem', borderRadius: 8, marginBottom: '1rem',
                        fontSize: '0.84rem', fontWeight: 500,
                        background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: msg.type === 'success' ? '#166534' : '#991b1b',
                        border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    }}>
                        {msg.text}
                    </div>
                )}

                {step === 'otp' ? (
                    <>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
                            We'll send a one-time code to your registered email address.
                        </p>
                        <button
                            onClick={sendOtp} disabled={sending}
                            style={{
                                width: '100%', padding: '0.6rem', borderRadius: 10,
                                border: '1px solid #e2e8f0', background: '#f8fafc',
                                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                                color: '#1d4ed8', marginBottom: '1rem', transition: 'all 0.15s',
                            }}
                        >
                            {sending ? 'Sending…' : 'Send OTP to Email'}
                        </button>
                        <input
                            type="text" maxLength={6} value={otp}
                            onChange={e => setOtp(e.target.value)}
                            placeholder="Enter 6-digit OTP"
                            style={{
                                width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10,
                                border: '1px solid #e2e8f0', fontSize: '0.95rem',
                                marginBottom: '1rem', outline: 'none', letterSpacing: '0.2em',
                                textAlign: 'center',
                            }}
                        />
                        <button
                            onClick={verifyOtp} disabled={loading}
                            style={{
                                width: '100%', padding: '0.65rem', borderRadius: 10,
                                border: 'none', background: '#1d4ed8', color: '#fff',
                                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            {loading ? 'Verifying…' : 'Verify & Continue'}
                        </button>
                    </>
                ) : (
                    <>
                        {(['New Password', 'Confirm Password'] as const).map((label, i) => (
                            <div key={i} style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                                    {label}
                                </label>
                                <input
                                    type="password"
                                    value={i === 0 ? newPass : confirm}
                                    onChange={e => i === 0 ? setNewPass(e.target.value) : setConfirm(e.target.value)}
                                    placeholder="Min 8 characters"
                                    style={{
                                        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 10,
                                        border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                                    }}
                                />
                            </div>
                        ))}
                        {/* <button
                            onClick={changePassword} disabled={loading}
                            style={{
                                width: '100%', padding: '0.65rem', borderRadius: 10,
                                border: 'none', background: '#1d4ed8', color: '#fff',
                                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem',
                            }}
                        >
                            {loading ? 'Saving…' : 'Change Password'}
                        </button> */}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Expandable nav group ─────────────────────────────────────────────────────

function NavGroup({
    item,
    collapsed,
    onClose,
    isActive,
}: {
    item: typeof NAV_ITEMS[number];
    collapsed: boolean;
    onClose?: () => void;
    isActive: (href: string, exact?: boolean) => boolean;
}) {
    const pathname = usePathname() ?? '';
    const childActive = item.children!.some(c =>
        c.exact ? pathname === c.href : pathname.startsWith(c.href)
    );
    const [open, setOpen] = useState(childActive);

    useEffect(() => {
        if (childActive) setOpen(true);
    }, [childActive]);

    const Icon = item.icon;

    return (
        <div>
            <button
                onClick={() => !collapsed && setOpen(o => !o)}
                title={collapsed ? item.label : undefined}
                className={`sidebar-nav-item ${childActive || open ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}`}
                style={{
                    width: '100%',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    paddingLeft: collapsed ? 0 : undefined,
                }}
            >
                <Icon size={collapsed ? 18 : 16} style={{ flexShrink: 0 }} />
                {!collapsed && (
                    <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {open ? <BsChevronUp size={12} /> : <BsChevronDown size={12} />}
                    </>
                )}
            </button>

            {!collapsed && open && (
                <div
                    style={{
                        marginLeft: '0.75rem',
                        paddingLeft: '0.75rem',
                        borderLeft: '2px solid rgba(255,255,255,0.2)',
                        marginBottom: '0.25rem',
                    }}
                >
                    {item.children!.map(child => {
                        const CIcon = child.icon;
                        const cActive = child.exact
                            ? pathname === child.href
                            : pathname.startsWith(child.href);
                        return (
                            <Link
                                key={child.href}
                                href={child.href as Route}
                                onClick={onClose}
                                className={`sidebar-nav-item sidebar-nav-sub ${cActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}`}
                            >
                                <CIcon size={14} style={{ flexShrink: 0 }} />
                                <span>{child.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({ collapsed, redirectTo = '/auth/sign-in', bottomRef, onClose }: SidebarContentProps) {
    const pathname = usePathname() ?? '';
    const { logout, isLoading } = useAuth();
    const [showPwdModal, setShowPwdModal] = useState(false);

    const handleLogout = async () => await logout(redirectTo);

    const isActive = (href: string, exact = false) =>
        exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));

    return (
        <>
            {showPwdModal && <PasswordResetModal onClose={() => setShowPwdModal(false)} />}

            <div className="d-flex flex-column" style={{ height: '100%', overflow: 'hidden' }}>
                <ProfileSection
                    collapsed={collapsed}
                    onPasswordReset={() => setShowPwdModal(true)}
                />

                <nav
                    style={{
                        flex: '1 1 0',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '0.75rem 0.5rem',
                        minHeight: 0,
                    }}
                >
                    {NAV_ITEMS.map((item) => {
                        if (item.children) {
                            return (
                                <NavGroup
                                    key={item.href}
                                    item={item}
                                    collapsed={collapsed}
                                    onClose={onClose}
                                    isActive={isActive}
                                />
                            );
                        }

                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href as Route}
                                onClick={onClose}
                                title={collapsed ? item.label : undefined}
                                className={`sidebar-nav-item ${active ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}`}
                                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                            >
                                <Icon size={collapsed ? 18 : 16} style={{ flexShrink: 0 }} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div ref={bottomRef} style={{ borderTop: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem' }}>
                    <button
                        onClick={handleLogout}
                        disabled={isLoading}
                        title={collapsed ? 'Logout' : undefined}
                        className="sidebar-logout-btn bg-danger text-white"
                        style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                    >
                        <BsBoxArrowRight size={collapsed ? 18 : 16} style={{ flexShrink: 0 }} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export default function UserSidebarLayout({ children }: SidebarLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);
    const [toggleBottom, setToggleBottom] = useState(80);
    const pathname = usePathname();

    useEffect(() => { setMobileOpen(false); }, [pathname]);
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    useLayoutEffect(() => {
        const update = () => {
            if (bottomRef.current && sidebarRef.current) {
                const sr = sidebarRef.current.getBoundingClientRect();
                const br = bottomRef.current.getBoundingClientRect();
                setToggleBottom(sr.bottom - (br.top + br.height / 2));
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [collapsed]);

    return (
        <>
            <style>{`
                /* ── Sidebar chrome ── */
                .usr-sidebar {
                    background: #5b50e1;
                    color: rgba(255,255,255,0.9);
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    position: sticky;
                    top: 0;
                    overflow: hidden;
                    border-radius: 16px;
                    box-shadow: 4px 0 12px rgba(0,0,0,0.15);
                    border-right: 1px solid rgba(255,255,255,0.15);
                    transition: width 0.25s ease-in-out, min-width 0.25s ease-in-out;
                    flex-shrink: 0;
                }
                .usr-sidebar .usr-sidebar-content {
                    overflow-y: auto;
                    flex: 1;
                }

                /* ── Nav items ── */
                .sidebar-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    padding: 0.7rem 0.85rem;
                    border-radius: 10px;
                    margin-bottom: 2px;
                    font-size: 0.82rem;
                    font-weight: 500;
                    color: rgba(255,255,255,0.85);
                    text-decoration: none;
                    cursor: pointer;
                    transition: background 0.2s, color 0.2s;
                    border: none;
                    background: transparent;
                    width: 100%;
                }
                .sidebar-nav-sub {
                    padding: 0.48rem 0.75rem;
                    font-size: 0.79rem;
                }
                .sidebar-nav-inactive:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
                .sidebar-nav-active {
                    background: rgba(255,255,255,0.18);
                    color: #fff !important;
                    font-weight: 400;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                }

                /* ── Logout ── */
                .sidebar-logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    padding: 0.7rem 0.85rem;
                    border-radius: 10px;
                    border: none;
                    background: transparent;
                    color: #fca5a5;
                    font-size: 0.82rem;
                    font-weight: 500;
                    cursor: pointer;
                    width: 100%;
                    transition: background 0.2s, color 0.2s;
                }
                .sidebar-logout-btn:hover {
                    background: rgba(252,165,165,0.2);
                    color: #fecaca;
                }

                /* ── Toggle button ── */
                .usr-toggle {
                    position: absolute;
                    right: -13px;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.8);
                    cursor: pointer;
                    z-index: 10;
                    transform: translateY(-50%);
                    transition: all 0.2s;
                }
                .usr-toggle:hover {
                    background: rgba(255,255,255,0.2);
                    border-color: rgba(255,255,255,0.4);
                    color: #fff;
                }

                /* ── Layout ── */
                .dashboard-main-wrapper {
                    display: flex;
                    height: 80vh;
                    overflow: hidden;
                    margin-top: 7.5rem;
                }
                .main-content-wrapper {
                    flex: 1;
                    overflow-y: auto;
                    background: transparent;
                    padding: 0rem 2rem;
                }

                /* ── Mobile bottom bar ── */
                .usr-mobile-bar-bottom {
                    display: none;
                    position: fixed;
                    bottom: 0; left: 0; right: 0;
                    height: 56px;
                    background: #5b50e1;
                    color: #fff;
                    z-index: 1030;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 1rem;
                    box-shadow: 0 1px 8px rgba(0,0,0,0.15);
                }
                @media (max-width: 767px) {
                    .usr-mobile-bar-bottom { display: flex; }
                    .usr-sidebar-desktop { display: none !important; }
                    .dashboard-main-wrapper {
                        display: block;
                        height: auto;
                        overflow: visible;
                        margin-top: 3rem;
                    }
                    .main-content-wrapper {
                        padding-left: 0;
                        padding-right: 0;
                        padding-bottom: calc(1.5rem + 56px);
                    }
                }
                @media (min-width: 768px) {
                    .usr-mobile-bar-bottom { display: none !important; }
                }

                /* ── Mobile drawer ── */
                .usr-drawer-backdrop {
                    position: fixed; inset: 0;
                    background: rgba(15,23,42,0.5);
                    backdrop-filter: blur(3px);
                    z-index: 1040;
                    opacity: 0; visibility: hidden;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }
                .usr-drawer-backdrop--open { opacity: 1; visibility: visible; }

                .usr-drawer {
                    position: fixed;
                    top: 0; left: 0;
                    width: 280px;
                    height: 100dvh;
                    background: #5b50e1;
                    z-index: 1050;
                    transform: translateX(-110%);
                    transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
                    overflow: hidden;
                    border-radius: 0 16px 16px 0;
                }
                .usr-drawer--open { transform: translateX(0); }

                .usr-drawer__top {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 1.1rem; height: 56px;
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                    flex-shrink: 0;
                }
                .usr-drawer__title {
                    font-size: 0.78rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    color: rgba(255,255,255,0.5);
                }
                .usr-drawer__close {
                    width: 32px; height: 32px; border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(255,255,255,0.08);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: rgba(255,255,255,0.7);
                    transition: all 0.15s;
                }
                .usr-drawer__close:hover {
                    background: rgba(255,255,255,0.18); color: #fff;
                }

                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            {/* ── Desktop layout ── */}
            <div className="dashboard-main-wrapper container">
                <aside
                    ref={sidebarRef}
                    className="usr-sidebar usr-sidebar-desktop no-scrollbar"
                    style={{
                        width: collapsed ? 64 : 250,
                        minWidth: collapsed ? 64 : 250,
                        position: 'relative',
                    }}
                >
                    <div className="usr-sidebar-content">
                        <SidebarContent collapsed={collapsed} bottomRef={bottomRef} />
                    </div>

                    <button
                        onClick={() => setCollapsed(c => !c)}
                        className="usr-toggle"
                        style={{ bottom: toggleBottom, position: 'absolute' }}
                        title={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? <BsChevronRight size={12} /> : <BsChevronLeft size={12} />}
                    </button>
                </aside>

                <main className="main-content-wrapper no-scrollbar">
                    {children}
                </main>
            </div>

            {/* ── Mobile bottom bar ── */}
            <div className="usr-mobile-bar-bottom">
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Dashboard</span>
                <button
                    onClick={() => setMobileOpen(true)}
                    style={{
                        width: 38, height: 38, borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.25)',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff',
                    }}
                    aria-label="Open sidebar"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
            </div>

            {/* ── Mobile backdrop ── */}
            <div
                className={`usr-drawer-backdrop${mobileOpen ? ' usr-drawer-backdrop--open' : ''}`}
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
            />

            {/* ── Mobile drawer ── */}
            <div
                className={`usr-drawer${mobileOpen ? ' usr-drawer--open' : ''}`}
                style={{ borderRadius: '0%' }}
                role="dialog"
                aria-modal="true"
                aria-label="Sidebar navigation"
            >
                <div style={{ height: '100vh', overflow: 'hidden' }}>
                    <SidebarContent
                        collapsed={false}
                        onClose={() => setMobileOpen(false)}
                    />
                </div>
            </div>
        </>
    );
}