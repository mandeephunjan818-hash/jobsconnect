'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// import MobileMenu from '../MobileMenu/MobileMenu';
import MegaMenu1 from './MegaMenu1';
import MegaMenu2 from './MegaMenu2';

const Header: React.FC = () => {
  const [mobailActive, setMobailState] = useState(false);
  const [isSticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const SubmitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div id="xb-header-area" className="header-area header-style-two header-transparent">
      {/* Top bar */}
      <div className="header-top">
        <span>
          Get 15% off on all annual plans until September 30! Join Texpo as we transform SEO 🚀
        </span>
        <span>
          <Link href="/">Learn more</Link>
          <i className="far fa-angle-right" />
        </span>
        <div className="header-shape">
          <div className="shape shape--one">
            <Image src="/images/shape/trangle-shape.png" alt="Shape 1" width={50} height={50} />
          </div>
          <div className="shape shape--two">
            <Image src="/images/shape/trangle-shape.png" alt="Shape 2" width={50} height={50} />
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className={`xb-header stricky ${isSticky ? 'stricked-menu stricky-fixed' : ''}`}>
        <div className="container">
          <div className="header__wrap ul_li_between">
            {/* Logo */}
            <div className="header-logo">
              <Link href="/">
                <Image src="/images/logo/logo-black.svg" alt="Texpo Logo" width={150} height={50} />
              </Link>
            </div>

            {/* Main Menu */}
            <div className="main-menu__wrap ul_li navbar navbar-expand-xl">
              <nav className="main-menu collapse navbar-collapse">
                <ul>
                  <li className="menu-item-has-children">
                    <Link href="/">
                      <span>Home</span>
                    </Link>
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
                    <Link href="/"><span>Company</span></Link>
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
                      <li><Link href="/blog-single"><span>Blog Details</span></Link></li>
                    </ul>
                  </li>

                  <li><Link href="/contact"><span>Contact</span></Link></li>
                </ul>
              </nav>

              {/* Mobile Menu Wrapper */}
              <div className="xb-header-wrap">
                <div className={`xb-header-menu ${mobailActive ? 'active' : ''}`}>
                  <div className="xb-header-menu-scroll lenis lenis-smooth">
                    <div className="xb-menu-close xb-hide-xl xb-close" onClick={() => setMobailState(!mobailActive)} />
                    <div className="xb-logo-mobile xb-hide-xl">
                      <Link href="/" rel="home">
                        <Image src="/images/logo/logo-black.svg" alt="Mobile Logo" width={150} height={50} />
                      </Link>
                    </div>
                    <div className="xb-header-mobile-search xb-hide-xl">
                      <form role="search" onSubmit={SubmitHandler}>
                        <input type="text" placeholder="Search..." name="s" className="search-field" />
                        <button className="search-submit" type="submit">
                          <i className="far fa-search" />
                        </button>
                      </form>
                    </div>
                    <nav className="xb-header-nav">
                      {/* <MobileMenu /> */}
                    </nav>
                  </div>
                </div>
                <div className="xb-header-menu-backdrop"></div>
              </div>
            </div>

            {/* Mobile toggle button */}
            <div className="header-bar-mobile side-menu d-xl-none">
              <button className="xb-nav-mobile" onClick={() => setMobailState(!mobailActive)}>
                <i className="far fa-bars" />
              </button>
            </div>

            {/* CTA */}
            <div className="header-contact d-none d-md-block">
              <Link href="/contact" className="thm-btn thm-btn--aso thm-btn--header-black">
                Let’s talk
                <Image src="/images/icon/sms-white-icon01.svg" alt="Message Icon" width={20} height={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
