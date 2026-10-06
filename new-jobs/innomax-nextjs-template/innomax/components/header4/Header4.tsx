"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import Image from 'next/image';

import logo from '../../public/images/logo/logo-white.svg';
import logo2 from '../../public/images/logo/logo-black.svg';

// import MobileMenu from '../MobileMenu/MobileMenu';
import MegaMenu1 from './MegaMenu1';
import MegaMenu2 from './MegaMenu2';

const Header4: React.FC = () => {
  const [mobailActive, setMobailState] = useState(false);
  const [isSticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const SubmitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div id="xb-header-area" className="header-area header-style-three header-transparent">
      <div className={`xb-header stricky ${isSticky ? 'stricked-menu stricky-fixed' : ''}`}>
        <div className="container">
          <div className="header__wrap ul_li_between">
            <div className="header-logo">
              <Link href="/">
                <Image src={logo} alt="Innomax Logo" />
              </Link>
            </div>

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
                    <Link href="/"><span>company</span></Link>
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

              <div className="xb-header-wrap">
                <div className={`xb-header-menu ${mobailActive ? "active" : ""}`}>
                  <div className="xb-header-menu-scroll lenis lenis-smooth">
                    <div className="xb-menu-close xb-hide-xl xb-close" onClick={() => setMobailState(!mobailActive)}></div>

                    <div className="xb-logo-mobile xb-hide-xl">
                      <Link href="/" rel="home">
                        <Image src={logo2} alt="Innomax Mobile Logo" />
                      </Link>
                    </div>

                    <div className="xb-header-mobile-search xb-hide-xl">
                      <form role="search" onSubmit={SubmitHandler}>
                        <input
                          type="text"
                          placeholder="Search..."
                          name="s"
                          className="search-field"
                          aria-label="Search"
                        />
                        <button className="search-submit" type="submit" aria-label="Submit Search">
                          <i className="far fa-search"></i>
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

            <div className="header-bar-mobile side-menu d-xl-none">
              <button
                className="xb-nav-mobile"
                onClick={() => setMobailState(!mobailActive)}
                aria-label="Toggle mobile menu"
              >
                <i className="far fa-bars"></i>
              </button>
            </div>

            <div className="header-contact d-none d-md-block">
              <Link href="/contact" className="blc-btn">
                <span>Get started now</span>
                <span className="btn-shape">
                  <svg
                    width="216"
                    height="56"
                    viewBox="0 0 216 56"
                    fill="none"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 17.4615L20.3067 1H196.849L215 17.4434V39.5385L196.866 55H20.3067L1 38.5385V17.4615Z"
                      fill="#010315"
                      stroke="url(#paint0_linear_1668_276)"
                      strokeWidth="2"
                    />
                    <defs>
                      <linearGradient
                        id="paint0_linear_1668_276"
                        x1="216"
                        y1="57.4519"
                        x2="177.902"
                        y2="2.40647"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0" stopColor="#6780D2" />
                        <stop offset="1" stopColor="#2F3B8D" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span className="btn-shape2">
                  <svg
                    width="216"
                    height="56"
                    viewBox="0 0 216 56"
                    fill="none"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.9383 0H197.235L216 17V40L197.235 56H19.9383L0 39V17L19.9383 0Z"
                      fill="url(#paint0_linear_3008_331)"
                    />
                    <defs>
                      <linearGradient
                        id="paint0_linear_3008_331"
                        x1="0.771422"
                        y1="27.9982"
                        x2="216.014"
                        y2="25.5754"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0" stopColor="#431DAB" />
                        <stop offset="1" stopColor="#AE6DFE" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header4;
