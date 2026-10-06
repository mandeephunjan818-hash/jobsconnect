"use client";

import menu_data from "@/data/menu-data";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function Navmenu({ data, isOpen, selectedPages, currentPath }: any) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [openInner, setOpenInner] = useState<string | null>(null);
    const [isDesktop, setIsDesktop] = useState(true);
    const menuRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 992);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        setOpenDropdown(null);
        setOpenInner(null);
    }, [currentPath]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
                setOpenInner(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = (title: string) => {
        setOpenDropdown(prev => prev === title ? null : title);
        setOpenInner(null);
    };

    const toggleInner = (title: string) => {
        setOpenInner(prev => prev === title ? null : title);
    };

    const isActive = (href: string) => {
        if (!currentPath) return false;
        if (href === "#" || href === "javascript:void(0)") return false;
        if (href === "/") return currentPath === href;
        return currentPath.startsWith(href);
    };

    const activeClass = (href: string) => (isActive(href) ? "nav-link-active" : "");

    // Styles for main dropdown container
    const dropdownContainerStyle = isDesktop
        ? {
            position: "absolute" as const,
            top: "100%",
            left: 0,
            zIndex: 9999,
            backgroundColor: "#fff",
            boxShadow: "0 0.5rem 1rem rgba(0,0,0,0.15)",
            borderRadius: "0.5rem",
            minWidth: "12rem",
            padding: "0.5rem 0",
            margin: 0,
        }
        : {
            position: "static" as const,
            backgroundColor: "transparent",
            boxShadow: "none",
            paddingLeft: "1rem",
        };

    // Styles for inner dropdown
    const innerDropdownStyle = isDesktop
        ? {
            position: "absolute" as const,
            top: 0,
            left: "100%",
            backgroundColor: "#fff",
            boxShadow: "0 0.5rem 1rem rgba(0,0,0,0.15)",
            borderRadius: "0.5rem",
            minWidth: "12rem",
            padding: "0.5rem 0",
            zIndex: 9999,
        }
        : {
            position: "static" as const,
            backgroundColor: "transparent",
            boxShadow: "none",
            paddingLeft: "1rem",
        };

    const itemStyle = isDesktop
        ? { whiteSpace: "nowrap" as const }
        : { whiteSpace: "normal" as const };

    return (
        <ul ref={menuRef} className="navbar-nav align-items-xl-center mt-4 mt-xl-0">
            {menu_data.map((item, i) => (
                <li
                    key={i}
                    className="startix-dd px-3 px-md-auto"
                    style={{ position: "relative" }}
                >
                    <div className="d-flex align-items-center">
                        {item.has_dropdown ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => toggleDropdown(item.title)}
                                    className={`nav-link-btn ${data || isOpen || selectedPages ? "text-black" : "text-black"} ${activeClass(item.link)}`}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        padding: 0,
                                        cursor: "pointer",
                                        fontWeight: "400",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    {item.title}
                                </button>
                                <i
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDropdown(item.title);
                                    }}
                                    className="ti ti-caret-down-filled text-dark ms-1"
                                    style={{ cursor: "pointer", fontSize: "0.75rem" }}
                                />
                            </>
                        ) : (
                            <Link
                                href={item.link}
                                className={` ${data || isOpen || selectedPages ? "text-black" : "text-black"} ${activeClass(item.link)}`}
                                style={{fontSize:"14px", fontWeight:"400"}}
                            >
                                {item.title}
                            </Link>
                        )}
                    </div>

                    {item.has_dropdown && openDropdown === item.title && (
                        <div style={dropdownContainerStyle}>
                            {item.submenu?.map((sub, idx) => (
                                <div key={idx} style={{ position: "relative" }}>
                                    <div className="d-flex align-items-center justify-content-between">
                                        {sub.has_inner_dropdown ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleInner(sub.title)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        width: "100%",
                                                        textAlign: "left",
                                                        padding: "0.5rem 1rem",
                                                        cursor: "pointer",
                                                        ...itemStyle,
                                                    }}
                                                >
                                                    {sub.title}
                                                </button>
                                                <i
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleInner(sub.title);
                                                    }}
                                                    className="ti ti-caret-right-filled text-dark me-2"
                                                    style={{ cursor: "pointer", fontSize: "0.7rem" }}
                                                />
                                            </>
                                        ) : (
                                            <Link
                                                href={sub.link}
                                                style={{
                                                    fontSize: "14px",
                                                    display: "block",
                                                    padding: "0.5rem 1rem",
                                                    ...itemStyle,
                                                }}
                                            >
                                                {sub.title}
                                            </Link>
                                        )}
                                    </div>

                                    {sub.has_inner_dropdown && openInner === sub.title && (
                                        <div style={innerDropdownStyle}>
                                            {sub.submenu?.map((inner, innerIdx) => (
                                                <Link
                                                    key={innerIdx}
                                                    href={inner.link}
                                                    style={{
                                                        display: "block",
                                                        padding: "0.5rem 1rem",
                                                        ...itemStyle,
                                                    }}
                                                >
                                                    {inner.title}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </li>
            ))}

            <style jsx>{`
                .nav-link-active,
                .nav-link-btn.nav-link-active {
                    position: relative;
                    color: #3147ff !important;
                }
                .nav-link-active::after,
                .nav-link-btn.nav-link-active::after {
                    content: '';
                    position: absolute;
                    bottom: -4px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background-color: #3147ff;
                    border-radius: 2px;
                }
                .nav-link-btn {
                    font-weight: inherit;
                    font-size: inherit;
                    font-family: inherit;
                }
                @media (max-width: 991px) {
                    .nav-link-active::after,
                    .nav-link-btn.nav-link-active::after {
                        bottom: 1px;
                    }
                }
            `}</style>
        </ul>
    );
}