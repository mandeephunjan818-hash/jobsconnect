"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import MobileMenu from "../../components/MobileMenu/MobileMenu";
import menu_data from "../../data/menu-data";

interface Props {
    logoUrl?: string;
    logoAlt?: string;
}

const HeaderThreeClient = ({ logoUrl, logoAlt }: Props) => {
    const [mobailActive, setMobailState] = useState(false);
    const [isSticky, setSticky] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setSticky(window.scrollY > 80);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Helper to render nested submenus (for dropdowns with inner dropdowns)
    const renderSubMenu = (items: any[]) => (
        <ul className="submenu">
            {items.map((item, i) => {
                if ("has_inner_dropdown" in item && item.has_inner_dropdown) {
                    return (
                        <li key={i} className="menu-item-has-children">
                            <Link href={item.link || "#"}>
                                <span>{item.title}</span>
                            </Link>
                            {renderSubMenu(item.sub_menus)}
                        </li>
                    );
                }
                return (
                    <li key={i}>
                        <Link href={item.link || "#"}>
                            <span>{item.title}</span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );

    // Placeholder text when no logo is provided
    const NoLogoText = ({ mobile }: { mobile?: boolean }) => (
        <span
            className={`d-flex align-items-center justify-content-center me-auto ${isSticky ? "text-dark" : "text-white"} ${mobile ? "h5" : "h4"}`}
            style={{
                fontSize: mobile ? "16px" : "18px",
                fontWeight: "bold",
                display: "inline-block",
                padding: mobile ? "8px 0" : "0",
            }}
        >
            No logo provided
        </span>
    );

    return (
        <div
            id="xb-header-area"
            className="header-area header-style-two header-style-six header-transparent"
        >
            <div
                className={`xb-header stricky ${isSticky ? "stricked-menu stricky-fixed" : ""}`}
            >
                <div className="container">
                    <div className="header__wrap ul_li_between">
                        {/* Logo */}
                        <div className="header-logo">
                            <Link href="/">
                                {logoUrl ? (
                                    <Image
                                        src={logoUrl}
                                        alt={logoAlt || "Logo"}
                                        width={200}
                                        height={60}
                                        style={{ objectFit: "contain", objectPosition: "left center" }}
                                        unoptimized={logoUrl.startsWith("http")}
                                        priority
                                    />
                                ) : (
                                    <NoLogoText />
                                )}
                            </Link>
                        </div>

                        {/* Right Side Navigation */}
                        <div className="header-right ul_li">
                            <div className="main-menu__wrap ul_li navbar navbar-expand-xl">
                                <nav className="main-menu collapse navbar-collapse">
                                    <ul>
                                        {/* Dynamic menu from menu_data */}
                                        {menu_data.map((item, i) => (
                                            <li
                                                key={i}
                                                className={`${item.has_dropdown ? "menu-item-has-children" : ""}${item.sub_menus?.some((s) => s.has_inner_dropdown)
                                                    ? " megamenu"
                                                    : ""
                                                    }`}
                                            >
                                                <Link href={item.link}>
                                                    <span>{item.title}</span>
                                                </Link>
                                                {item.has_dropdown && item.sub_menus && renderSubMenu(item.sub_menus)}
                                            </li>
                                        ))}
                                    </ul>
                                </nav>

                                {/* Mobile Menu */}
                                <nav className="xb-header-nav">
                                    {/* Pass menu_data to your MobileMenu so it can render the same items */}
                                    <MobileMenu
                                        menuData={menu_data}
                                        open={mobailActive}
                                        onClose={() => setMobailState(false)}
                                    />
                                </nav>
                            </div>

                            {/* Mobile Hamburger Icon */}
                            <div className="header-bar-mobile side-menu d-xl-none">
                                <button
                                    className="xb-nav-mobile"
                                    onClick={() => setMobailState(!mobailActive)}
                                >
                                    <i className="far fa-bars"></i>
                                </button>
                            </div>

                            {/* CTA Button */}
                            <div className="header-contact d-none d-md-block">
                                <Link href="/contact" className="thm-btn thm-btn--data thm-btn--header">
                                    Post Job
                                    <span>
                                        <i className="fal fa-arrow-right"></i>
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeaderThreeClient;