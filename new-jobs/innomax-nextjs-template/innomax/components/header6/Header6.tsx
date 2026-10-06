"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Link as ScrollLink } from 'react-scroll';
import Link from 'next/link';
import icon1 from '../../public/images/shape/trangle-shape04.png';
import logo from '../../public/images/logo/logo-black03.svg';
import icon from '../../public/images/icon/arrow-black.png';
// import MobileMenu from '../MobileMenu/MobileMenu';
import Image from 'next/image';

const Header: React.FC = () => {
  const [mobileActive, setMobileActive] = useState(false);
  const [isSticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Add your search logic here or leave as is if search is not functional yet
  };

  return (
    <div id="xb-header-area" className="header-area header-style-two header-style-four header-transparent">
      <div className="header-top">
        <span>Get 15% off on all annual plans until September 30! Join Texpo as we transform SEO 🚀</span>
        <span>
          <Link href="/">Learn more</Link>
          <i className="far fa-angle-right"></i>
        </span>
        <div className="header-shape">
          <div className="shape shape--one"><Image src={icon1} alt="Shape one" /></div>
          <div className="shape shape--two"><Image src={icon1} alt="Shape two" /></div>
        </div>
      </div>

      <div className={`xb-header stricky ${isSticky ? 'stricked-menu stricky-fixed' : ''}`}>
        <div className="container">
          <div className="header__wrap ul_li_between">
            <div className="header-logo">
              <Link href="/" aria-label="Homepage">
                <Image src={logo} alt="Logo" />
              </Link>
            </div>

            <div className="main-menu__wrap ul_li navbar navbar-expand-xl">
              <nav className="main-menu collapse navbar-collapse">
                <ul>
                  <li className="menu-item-has-children">
                    <Link href="/" passHref>
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
                  <li>
                    <ScrollLink to="features" spy smooth duration={500} offset={-100} className="menu-item" role="link" tabIndex={0}>
                      Features
                    </ScrollLink>
                  </li>
                  <li>
                    <ScrollLink to="funfact" spy smooth duration={500} offset={-100} className="menu-item" role="link" tabIndex={0}>
                      Fanfact
                    </ScrollLink>
                  </li>
                  <li>
                    <ScrollLink to="integration" spy smooth duration={500} offset={-100} className="menu-item" role="link" tabIndex={0}>
                      Integration
                    </ScrollLink>
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

              <div className="xb-header-wrap">
                <div className={`xb-header-menu ${mobileActive ? "active" : ""}`}>
                  <div className="xb-header-menu-scroll lenis lenis-smooth">
                    <button className="xb-menu-close xb-hide-xl xb-close" onClick={() => setMobileActive(false)} aria-label="Close menu"></button>
                    <div className="xb-logo-mobile xb-hide-xl">
                      <Link href="/" aria-label="Homepage">
                        <Image src={logo} alt="Logo" />
                      </Link>
                    </div>
                    <div className="xb-header-mobile-search xb-hide-xl">
                      <form role="search" onSubmit={submitHandler}>
                        <input type="text" placeholder="Search..." name="s" className="search-field" />
                        <button className="search-submit" type="submit" aria-label="Search">
                          <i className="far fa-search"></i>
                        </button>
                      </form>
                    </div>
                    <nav className="xb-header-nav">
                      {/* <MobileMenu /> */}
                    </nav>
                  </div>
                </div>
                <div className="xb-header-menu-backdrop" onClick={() => setMobileActive(false)}></div>
              </div>
            </div>

            <div className="header-bar-mobile side-menu d-xl-none">
              <button className="xb-nav-mobile" onClick={() => setMobileActive(true)} aria-label="Open menu">
                <i className="far fa-bars"></i>
              </button>
            </div>

            <div className="xb-btn d-none d-md-block">
              <Link href="/pricing" className="thm-btn thm-btn--three thm-btn--black" aria-label="Start your free trial">
                Start your free trial
                <span>
                  <Image className="img--one" src={icon} alt="" />
                  <Image className="img--two" src={icon} alt="" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
