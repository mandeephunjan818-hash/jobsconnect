// components/Footer/FooterClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FiLinkedin,
  FiTwitter,
  FiFacebook,
  FiInstagram,
  FiMapPin,
  FiMail,
  FiPhone,
  FiCompass,
  FiGrid,
  FiHeadphones,
  FiTrendingUp,
} from "react-icons/fi";

interface FooterCategory {
  label: string;
  href: string;
  count: number;
}

interface FooterBlog {
  title: string;
  date: string;
  href: string;
}

interface FooterClientProps {
  logoUrl?: string;
  logoAlt?: string;
  categories?: FooterCategory[];
  latestBlogs?: FooterBlog[];
  address?: string;
  email?: string;
  phone?: string;
}

const quickLinks = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/service" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Use", href: "/terms-conditions" },
];

// ---------- Date formatter ----------
function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------- Reusable heading with icon + underline accent ----------
const ColTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <h4 className="ft-col-title gap-2 d-flex align-items-center justify-content-start" style={{color:"var(--color-navy, #16215c)"}}>
    <span className="ft-col-title-icon">{icon}</span>
    <span className="ft-col-title-text">{children}</span>
  </h4>
);

// ---------- Component ----------
const FooterClient: React.FC<FooterClientProps> = ({
  logoUrl,
  logoAlt,
  categories = [],
  latestBlogs = [],
  address,
  email,
  phone,
}) => {
  const hasLogo = Boolean(logoUrl);
  const hasLogoText = Boolean(logoAlt);

  return (
    <footer className="ft-footer pos-rel px-5">
      <div className="container ft-container">
        {/* ---- Top grid ---- */}
        <div className="ft-grid">
          {/* Brand */}
          <div className="ft-col ft-col--brand">
            <Link href="/" className="ft-logo d-inline-block">
              {hasLogo ? (
                <Image
                  src={logoUrl as string}
                  alt={logoAlt || "Logo"}
                  width={150}
                  height={44}
                  style={{ objectFit: "contain" }}
                  unoptimized={logoUrl!.startsWith("http")}
                />
              ) : hasLogoText ? (
                <span className="ft-logo-text">{logoAlt}</span>
              ) : (
                <span className="ft-logo-placeholder">No data available</span>
              )}
            </Link>

            <p className="ft-tagline">
              Real roles for people building a life in Canada — filtered,
              verified, and posted by employers who are actually hiring.
            </p>

            <ul className="ft-social">
              <li>
                <a href="#" aria-label="LinkedIn"><FiLinkedin size={14} /></a>
              </li>
              <li>
                <a href="#" aria-label="Twitter / X"><FiTwitter size={14} /></a>
              </li>
              <li>
                <a href="#" aria-label="Facebook"><FiFacebook size={14} /></a>
              </li>
              <li>
                <a href="#" aria-label="Instagram"><FiInstagram size={14} /></a>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div className="ft-col">
            <ColTitle icon={<FiCompass size={13} />}>Quick Links</ColTitle>
            <ul className="ft-link-list">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}><span className="ft-tagline">{link.label}</span></Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="ft-col">
            <ColTitle icon={<FiGrid size={13} />}>Categories</ColTitle>
            {categories.length > 0 ? (
              <ul className="ft-link-list">
                {categories.map((cat) => (
                  <li key={cat.label}>
                    <Link href={cat.href}>
                      <span className="ft-tagline">{cat.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ft-empty">No categories available yet.</p>
            )}
          </div>

          {/* Contact info */}
          <div className="ft-col">
            <ColTitle icon={<FiHeadphones size={13} />}>Contact</ColTitle>
            <ul className="ft-contact-list">
              <li>
                <span className="ft-contact-icon"><FiMapPin size={13} /></span>
                <span className={address ? "" : "ft-empty-inline"}>
                  {address || "Address not available"}
                </span>
              </li>
              <li>
                <span className="ft-contact-icon"><FiMail size={13} /></span>
                {email ? (
                  <a href={`mailto:${email}`} className="ft-tagline">{email}</a>
                ) : (
                  <span className="ft-empty-inline">Email not available</span>
                )}
              </li>
              <li>
                <span className="ft-contact-icon"><FiPhone size={13} /></span>
                {phone ? (
                  <a href={`tel:${phone}`} className="ft-tagline">{phone}</a>
                ) : (
                  <span className="ft-empty-inline">Phone not available</span>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* ---- Latest insights strip ---- */}
        {/* <div className="ft-insights">
          <div className="ft-insights-head">
            <ColTitle icon={<FiTrendingUp size={13} />}>Latest Insights</ColTitle>
            {latestBlogs.length > 0 && (
              <div className="xb-btn text-center">
                <Link
                  href='/blog'
                  className="thm-btn thm-btn--fill_icon thm-btn--data thm-btn--data_blue"
                >
                  <div className="xb-item--hidden">
                    <span className="xb-item--hidden-text">View All</span>
                  </div>
                  <div className="xb-item--holder">
                    <span className="xb-item--text xb-item--text1">
                      View All
                    </span>
                    <div className="xb-item--icon">
                      <i className="fal fa-plus"></i>
                    </div>
                    <span className="xb-item--text xb-item--text2">
                      View All
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {latestBlogs.length > 0 ? (
            <ul className="ft-insights-list">
              {latestBlogs.map((post) => (
                <li key={post.title}>
                  <span className="ft-insights-date">{formatDate(post.date)}</span>
                  <Link href={post.href} className="ft-link ft-insights-title">
                    <span className="ft-tagline">
                      {post.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ft-empty">No articles published yet.</p>
          )}
        </div> */}

        {/* ---- Bottom bar ---- */}
        <div className="ft-bottom">
          <p className="ft-copyright">
            © {new Date().getFullYear()}{" "}
            {hasLogoText ? (
              <Link href="/" className="ft-tagline">{logoAlt}</Link>
            ) : (
              <span className="ft-empty-inline">No data available</span>
            )}
            . All rights reserved.
          </p>
          <ul className="ft-legal">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href}><span className="ft-tagline text-white">{link.label}</span></Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style jsx>{`
        .ft-footer {
          position: relative;
        }
        .ft-container {
          padding: 44px 0 0;
        }

        /* ---- Top grid ---- */
        .ft-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 28px;
          padding-bottom: 28px;
          border-bottom: 1px solid rgba(22, 33, 92, 0.08);
        }

        .ft-col--brand {
          max-width: 300px;
        }

        .ft-logo-text {
          font-family: var(--font-heading, inherit);
          font-weight: 400;
          font-size: 20px;
          color: var(--color-navy, #16215c);
        }

        .ft-logo-placeholder {
          font-family: var(--font-body, inherit);
          font-size: 13px;
          font-style: italic;
          color: #64748b;
        }

        .ft-tagline {
          margin: 12px 0 16px;
          font-family: var(--font-body, inherit);
          font-size: 13.5px;
          line-height: 1.6;
          color: #0f0f0f;
        }

        /* ---- Unified icon language: social + contact icons share
               the exact same shape, tint, and hover behavior now ---- */
        .ft-social {
          display: flex;
          gap: 8px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .ft-social a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(44, 82, 189, 0.08);
          border: 1px solid rgba(44, 82, 189, 0.12);
          color: var(--color-primary, #2c52bd);
          transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease,
            border-color 0.25s ease;
        }

        .ft-social a:hover {
          background: var(--color-primary, #2c52bd);
          border-color: var(--color-primary, #2c52bd);
          color: #ffffff;
          transform: translateY(1px);
        }

        /* ---- Heading with icon accent + underline ---- */
        .ft-col-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-heading, inherit);
          font-weight: 400;
          font-size: 18px;
          color: var(--color-navy, #16215c);
          margin: 0 0 10px;
          padding-bottom: 12px;
          position: relative;
        }

        .ft-col-title::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 34px;
          height: 2px;
          border-radius: 2px;
          background: var(--color-primary, #2c52bd);
        }

        .ft-col-title-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          margin-right: 5px;
          flex-shrink: 0;
          border-radius: 6px;
          background: rgba(44, 82, 189, 0.08);
          color: var(--color-primary, #2c52bd);
        }

        .ft-col-title-text {
          color: var(--color-navy, #16215c);
          line-height: 1;
        }

        .ft-link-list,
        .ft-contact-list {
          list-style: none;
          margin: 14px 0 0;
          padding: 0;
        }

        .ft-link-list li:not(:last-child),
        .ft-contact-list li:not(:last-child) {
          margin-bottom: 10px;
        }

        .ft-contact-list li {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-family: var(--font-body, inherit);
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
        }

        .ft-contact-icon {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          margin-top: 1px;
          border-radius: 6px;
          background: rgba(44, 82, 189, 0.08);
          color: var(--color-primary, #2c52bd);
        }

        .ft-empty-inline {
          font-style: italic;
          color: rgba(22, 33, 92, 0.35);
        }

        .ft-link {
          font-family: var(--font-body, inherit);
          font-size: 13.5px;
          color: #64748b;
          transition: color 0.2s ease;
        }

        .ft-link:hover {
          color: var(--color-primary, #2c52bd);
        }

        .ft-count {
          color: var(--color-primary, #2c52bd);
          font-weight: 400;
        }

        .ft-empty {
          font-family: var(--font-body, inherit);
          font-size: 13px;
          font-style: italic;
          color: rgba(22, 33, 92, 0.35);
        }

        /* ---- Insights ---- */
        .ft-insights {
          padding: 24px 0;
          border-bottom: 1px solid rgba(22, 33, 92, 0.08);
        }

        .ft-insights-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .ft-insights-head .ft-col-title {
          margin-bottom: 0;
        }

        .ft-viewall {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          font-family: var(--font-heading, inherit);
          font-weight: 400;
          font-size: 13px;
          color: var(--color-white, #fff);
          background: var(--color-primary, #2c52bd);
          border-radius: 50px;
          transition: background 0.3s ease, transform 0.3s ease;
        }

        .ft-viewall svg {
          transition: transform 0.3s ease;
        }

        .ft-viewall:hover {
          background: var(--color-navy, #16215c);
          transform: translateY(1px);
        }

        .ft-viewall:hover svg {
          transform: translateX(3px);
        }

        .ft-insights-list {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          list-style: none;
          margin: 16px 0 0;
          padding: 0;
        }

        .ft-insights-list li {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding-top: 12px;
          border-top: 1px solid rgba(22, 33, 92, 0.08);
        }

        .ft-insights-date {
          font-family: var(--font-body, inherit);
          font-size: 11.5px;
          font-weight: 400;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--color-primary, #2c52bd);
        }

        .ft-insights-title {
          line-height: 1.4;
        }

        /* ---- Bottom bar ---- */
        .ft-bottom {
          display: flex;
          border-radius:10px;
          margin-bottom:10px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          background: var(--color-navy, #16215c);
          padding: 16px 20px 20px;
        }

        .ft-copyright {
          font-family: var(--font-body, inherit);
          font-size: 13px;
          color: #ffffff;
        }

        .ft-legal {
          display: flex;
          gap: 18px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        /* ---- Responsive ---- */
        @media (max-width: 991px) {
          .ft-grid {
            grid-template-columns: 1fr 1fr;
            row-gap: 24px;
          }
          .ft-col--brand {
            grid-column: 1 / -1;
            max-width: 100%;
          }
          .ft-insights-list {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .ft-grid {
            grid-template-columns: 1fr;
          }
          .ft-insights-list {
            grid-template-columns: 1fr;
          }
          .ft-insights-head {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .ft-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </footer>
  );
};

export default FooterClient;