// AuthButton.tsx
"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useDismiss,
    useRole,
    useInteractions,
    FloatingPortal,
} from '@floating-ui/react';
import { BsListUl, BsInbox, BsCreditCard, BsBoxArrowRight } from 'react-icons/bs';

// ── Avatar (unchanged) ────────────────────────────────────────
interface AvatarProps {
    name?: string | null;
    size?: number;
    className?: string;
}

function Avatar({ name, size = 40, className = "" }: AvatarProps) {
    const firstLetter = name?.charAt(0).toUpperCase() || "?";
    const containerStyle = {
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: "var(--Primary)",
        color: "white",
        fontSize: size * 0.4,
        fontWeight: "bold",
        cursor: "pointer",
    };
    return <div style={containerStyle} className={className}>{firstLetter}</div>;
}

// ── Sub‑menu config ───────────────────────────────────────────
interface SubItem {
    href: string;
    label: string;
}

interface NavGroup {
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    items: SubItem[];
}

const AUTH_NAV: NavGroup[] = [
    {
        label: "Listings",
        icon: BsListUl,
        items: [{ href: "/dashboard/listings", label: "My listings" }],
    },
    {
        label: "Listing requests",
        icon: BsInbox,
        items: [
            { href: "/dashboard/job-bank", label: "Submit a request" },
            { href: "/dashboard/job-bank/requests", label: "All requests" },
        ],
    },
    {
        label: "Wallet & payments",
        icon: BsCreditCard,
        items: [
            { href: "/dashboard/wallet-payments/wallet", label: "Wallet" },
            { href: "/dashboard/wallet-payments/credits", label: "Buy credits" },
            { href: "/dashboard/wallet-payments/activity", label: "Activity history" },
        ],
    },
];

// ── Flyout group (like the first snippet’s FlyoutGroup) ───────
function FlyoutGroup({
    group,
    onCloseParent,
    cancelParentClose,
    scheduleParentClose,
}: {
    group: NavGroup;
    onCloseParent: () => void;
    cancelParentClose: () => void;
    scheduleParentClose: () => void;
}) {
    const Icon = group.icon;
    const [open, setOpen] = useState(false);
    const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openSub = () => {
        if (closeRef.current) clearTimeout(closeRef.current);
        cancelParentClose();          // keep parent open while submenu visible
        setOpen(true);
    };

    const closeSub = () => {
        closeRef.current = setTimeout(() => {
            setOpen(false);
        }, 120);
    };

    const cancelSubClose = () => {
        if (closeRef.current) clearTimeout(closeRef.current);
        cancelParentClose();
    };

    useEffect(() => () => { if (closeRef.current) clearTimeout(closeRef.current); }, []);

    // single‑item group → plain link
    if (group.items.length === 1) {
        const item = group.items[0];
        return (
            <li>
                <Link
                    href={item.href}
                    onClick={onCloseParent}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        width: "100%",
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        color: "#0f172a",
                        textDecoration: "none",
                        borderRadius: "0.375rem",
                        transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                        cancelParentClose();
                        (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "none";
                        scheduleParentClose();
                    }}
                >
                    <Icon size={16} />
                    {item.label}
                </Link>
            </li>
        );
    }

    // multi‑item group → flyout submenu
    const { refs, floatingStyles } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "right-start",
        middleware: [
            offset(4),
            flip({ fallbackPlacements: ["left-start", "bottom-start"], padding: 8 }),
            shift({ padding: 8 }),
        ],
        whileElementsMounted: autoUpdate,
    });

    return (
        <li
            style={{ position: "relative" }}
            onMouseEnter={openSub}
            onMouseLeave={closeSub}
        >
            <button
                ref={refs.setReference}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "0.5rem 1rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "#0f172a",
                    textAlign: "left",
                    borderRadius: "0.375rem",
                    transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Icon size={16} />
                    {group.label}
                </span>
                <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{
                        transform: open ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                        color: "#94a3b8",
                        flexShrink: 0,
                    }}
                >
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div
                    ref={refs.setFloating}
                    style={{
                        ...floatingStyles,
                        background: "#fff",
                        borderRadius: "0.5rem",
                        boxShadow: "0 12px 28px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
                        minWidth: "180px",
                        padding: "0.25rem 0",
                        zIndex: 1060,
                    }}
                    onMouseEnter={cancelSubClose}
                    onMouseLeave={closeSub}
                >
                    <div
                        style={{
                            padding: "0.4rem 1rem 0.3rem",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            color: "#94a3b8",
                            borderBottom: "1px solid #f1f5f9",
                            marginBottom: "0.2rem",
                        }}
                    >
                        {group.label}
                    </div>
                    {group.items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onCloseParent}
                            style={{
                                display: "block",
                                padding: "0.45rem 1rem",
                                fontSize: "0.855rem",
                                color: "#334155",
                                textDecoration: "none",
                                transition: "background 0.12s, color 0.12s",
                                whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                                cancelSubClose();
                                (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
                                (e.currentTarget as HTMLElement).style.color = "#0c67ec";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "none";
                                (e.currentTarget as HTMLElement).style.color = "#334155";
                            }}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </li>
    );
}

// ── Main AuthButton component ─────────────────────────────────
interface AuthButtonWrapperProps {
    isOpen: boolean;
}

export default function AuthButton({ isOpen }: AuthButtonWrapperProps) {
    const { data: session, status } = useSession();
    const { logout } = useAuth();
    const router = useRouter();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { refs, floatingStyles, context } = useFloating({
        open: dropdownOpen,
        onOpenChange: setDropdownOpen,
        placement: "bottom-end",          // like the first snippet
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    const dismiss = useDismiss(context, { escapeKey: true });
    const role = useRole(context, { role: "menu" });
    const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

    const openDropdown = useCallback(() => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setDropdownOpen(true);
    }, []);

    const cancelParentClose = useCallback(() => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    }, []);

    const scheduleParentClose = useCallback(() => {
        closeTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 150);
    }, []);

    useEffect(() => {
        return () => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); };
    }, []);

    const handleLogout = async () => {
        setDropdownOpen(false);
        await logout();
        router.push("/auth/sign-in");
    };

    if (status === "loading") {
        return <div className="btn btn-primary opacity-50">Loading…</div>;
    }

    if (isOpen) return null;

    if (status === "authenticated") {
        return (
            <>
                <button
                    ref={refs.setReference}
                    {...getReferenceProps()}
                    onMouseEnter={openDropdown}
                    onMouseLeave={scheduleParentClose}
                    className="d-flex align-items-center gap-2 border-0 bg-transparent p-0"
                    style={{ cursor: "pointer" }}
                >
                    <p className="text-sm font-medium text-black d-flex align-items-center justify-content-center gap-2 my-auto"
                        style={{ height: "fit-content" }}>
                        <span>Hi</span>
                        <span>{session?.user?.name?.slice(0, 5)}</span>
                        <span>!</span>
                    </p>
                    <Avatar name={session?.user?.name} size={32} />
                </button>

                {dropdownOpen && (
                    <FloatingPortal>
                        <ul
                            ref={refs.setFloating}
                            style={{
                                ...floatingStyles,
                                display: "block",
                                zIndex: 1050,
                                margin: 0,
                                listStyle: "none",
                                padding: "0.35rem 0",
                                borderRadius: "0.625rem",
                                backgroundColor: "#fff",
                                boxShadow: "0 12px 28px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
                                minWidth: "13rem",
                                overflow: "visible",
                            }}
                            {...getFloatingProps()}
                            onMouseEnter={cancelParentClose}
                            onMouseLeave={scheduleParentClose}
                        >
                            {AUTH_NAV.map((group) => (
                                <FlyoutGroup
                                    key={group.label}
                                    group={group}
                                    onCloseParent={() => setDropdownOpen(false)}
                                    cancelParentClose={cancelParentClose}
                                    scheduleParentClose={scheduleParentClose}
                                />
                            ))}

                            <li>
                                <hr style={{ margin: "0.35rem 0", border: "none", borderTop: "1px solid #f1f5f9" }} />
                            </li>
                            <li>
                                <button
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        width: "100%",
                                        padding: "0.5rem 1rem",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "0.875rem",
                                        color: "#dc2626",
                                        borderRadius: "0.375rem",
                                        transition: "background 0.12s",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                    onClick={handleLogout}
                                >
                                    <BsBoxArrowRight size={14} />
                                    Logout
                                </button>
                            </li>
                        </ul>
                    </FloatingPortal>
                )}
            </>
        );
    }

    // Unauthenticated
    return (
        <Link href="/auth/sign-up" passHref legacyBehavior>
            <a className="btn btn-primary" style={{ fontSize: "14px" }}>Post Job</a>
        </Link>
    );
}