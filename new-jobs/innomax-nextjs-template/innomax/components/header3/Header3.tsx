"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
// import MobileMenu from "../MobileMenu/MobileMenu";
import MegaMenu1 from "./MegaMenu1";
import MegaMenu2 from "./MegaMenu2";

import logo from "../../public/images/logo/logo06.svg";
import logo2 from "../../public/images/logo/logo06_dark.svg";

const Header3 = () => {
  const [mobailActive, setMobailState] = useState(false);
  const [isSticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 80);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

   const SubmitHandler = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
    };
    
  return (
    <div
      id="xb-header-area"
      className="header-area header-style-two header-style-six header-transparent"
    >
      <div className={`xb-header stricky ${isSticky ? "stricked-menu stricky-fixed" : ""}`}>
        <div className="container">
          <div className="header__wrap ul_li_between">
            {/* Logo */}
            <div className="header-logo">
              <Link href="/">
                <Image src={logo} alt="Light Logo" />
                <Image src={logo2} alt="Dark Logo" />
              </Link>
            </div>

            {/* Right Side Navigation */}
            <div className="header-right ul_li">
              <div className="main-menu__wrap ul_li navbar navbar-expand-xl">
                <nav className="main-menu collapse navbar-collapse">
                  <ul>
                    <li className="menu-item-has-children">
                      <Link href="/"><span>Home</span></Link>
                      <ul className="submenu">
                        <li><Link href="/"><span>SEO Agency</span></Link></li>
                        <li><Link href="/home-2"><span>It Services</span></Link></li>
                        <li><Link href="/home-3"><span>AI & Data Solutions</span></Link></li>
                        <li><Link href="/home-4"><span>Cyber Security</span></Link></li>
                        <li><Link href="/home-5"><span>Cloud and Devops</span></Link></li>
                        <li><Link href="/home-6"><span>Help desk SaaS</span></Link></li>
                      </ul>
                    </li>

                    <li className="menu-item-has-children megamenu">
                      <Link href="#"><span>Company</span></Link>
                      <MegaMenu1 />
                    </li>

                    <li className="menu-item-has-children megamenu">
                      <Link href="/service"><span>Services</span></Link>
                      <MegaMenu2 />
                    </li>

                    <li className="menu-item-has-children">
                      <Link href="/casestudy"><span>Casestudy</span></Link>
                      <ul className="submenu">
                        <li><Link href="/casestudy"><span>Casestudy</span></Link></li>
                        <li><Link href="/casestudy-details"><span>Casestudy Details</span></Link></li>
                      </ul>
                    </li>

                    <li className="menu-item-has-children">
                      <Link href="/blog"><span>Blog</span></Link>
                      <ul className="submenu">
                        <li><Link href="/blog"><span>Blog</span></Link></li>
                        <li><Link href="/blog-single">
                          <span>Blog Details</span></Link></li>
                      </ul>
                    </li>

                    <li><Link href="/contact"><span>Contact</span></Link></li>
                  </ul>
                </nav>

                {/* Mobile Menu */}
                <div className="xb-header-wrap">
                  <div className={`xb-header-menu ${mobailActive ? "active" : ""}`}>
                    <div className="xb-header-menu-scroll lenis lenis-smooth">
                      <div className="xb-menu-close xb-hide-xl xb-close" onClick={() => setMobailState(false)}></div>
                      <div className="xb-logo-mobile xb-hide-xl">
                        <Link href="/"><Image src={logo2} alt="Mobile Logo" /></Link>
                      </div>

                      {/* Mobile Search */}
                      <div className="xb-header-mobile-search xb-hide-xl">
                        <form role="search" onSubmit={SubmitHandler}>
                          <input type="text" placeholder="Search..." name="s" className="search-field" />
                          <button className="search-submit" type="submit"><i className="far fa-search"></i></button>
                        </form>
                      </div>

                      <nav className="xb-header-nav">
                        {/* <MobileMenu /> */}
                      </nav>
                    </div>
                  </div>
                  <div className="xb-header-menu-backdrop" onClick={() => setMobailState(false)}></div>
                </div>
              </div>

              {/* Mobile Hamburger Icon */}
              <div className="header-bar-mobile side-menu d-xl-none">
                <button className="xb-nav-mobile" onClick={() => setMobailState(!mobailActive)}>
                  <i className="far fa-bars"></i>
                </button>
              </div>

              {/* CTA Button */}
              <div className="header-contact d-none d-md-block">
                <Link href="/contact" className="thm-btn thm-btn--data thm-btn--header">
                  Get Started <span><i className="fal fa-plus"></i></span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header3;
