"use client";

import socialLinksFooter from '@/data/socialLinksFooter';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface FooterProps {
    logoUrl?: string;
    logoAlt?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
}

// ─── Inline icons (currentColor — inherits CSS, matches JobCard pattern) ────

function LocationIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 6-10 7L2 6" />
        </svg>
    );
}

function CallIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

/** Small chevron used as a bullet before each Quick Link — mirrors the
 *  breadcrumb separator and JobCard's "View Job" arrow treatment. */
function LinkArrowIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

/** Small paper-plane icon for the subscribe form's submit affordance. */
function SendIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    );
}

/** Small dot-grid mark used next to each section title for a distinct,
 *  branded look instead of a plain <h5>. */
function TitleMarkIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="5" r="2.4" />
            <circle cx="12" cy="5" r="2.4" />
            <circle cx="5" cy="12" r="2.4" />
            <circle cx="12" cy="12" r="2.4" />
        </svg>
    );
}

export default function FooterOneClient({
    logoUrl,
    logoAlt,
    contactEmail,
    phone,
    address,
}: FooterProps) {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Please enter your email address.');
            return;
        }
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, siteId: window.location.hostname }),
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to subscribe');

            toast.success(json.message || "You've successfully subscribed!");
            setEmail('');
        } catch (err: any) {
            toast.error(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <footer className="luminix-footer-section1">
            <div className="container">
                <div className="luminix-footer-one">
                    <div className="row gy-4 gy-lg-0">

                        {/* ── Brand column — kept as its own accent panel,
                             matching the original sidebar-style block, but
                             sized via CSS classes instead of inline px/rem
                             so it collapses properly on mobile ─────────── */}
                        <div className="col-xxl-4 col-xl-6 col-md-6">
                            <div className="luminix-footer-brand-panel">
                                <div className="luminix-footer-textarea">
                                    <Link href="/" className="luminix-footer-logo-link">
                                        {logoUrl ? (
                                            <Image
                                                src={logoUrl}
                                                alt={logoAlt || 'Logo'}
                                                width={160}
                                                height={48}
                                                className="luminix-footer-logo-img"
                                                unoptimized={logoUrl.startsWith('http')}
                                            />
                                        ) : (
                                            <div className="d-flex align-items-center gap-2" style={{ width: 'fit-content' }}>
                                                <div className="px-2 py-1 rounded text-white fw-bold bg-primary" style={{ fontSize: '1.1rem', lineHeight: 1.4 }}>JC</div>
                                                <p className="text-white mb-0 fw-semibold" style={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>
                                                    Jobs<span className="text-primary"> Connect</span>
                                                </p>
                                            </div>
                                        )}
                                    </Link>
                                    <p>To drive sustainable corporate success, we provide job listings from industry leaders who prioritize competitive innovations, operational efficiencies, and talent-centric hiring strategies.</p>
                                    <div className="luminix-social-wrap wrap2">
                                        <ul>
                                            {socialLinksFooter.map((link, index) => (
                                                <li key={index}>
                                                    <Link href={link.href} style={{ color: 'var(--accent-color)' }} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Quick Links — each item gets a small arrow
                             icon bullet, same visual language as the
                             "View Job" arrow in JobCard ─────────────────── */}
                        <div className="col-xxl-2 col-xl-6 col-md-6">
                            <div className="luminix-footer-menu ml-15 ml-50">
                                <div className="luminix-footer-title">
                                    <span className="luminix-footer-title-mark"><TitleMarkIcon /></span>
                                    <h5>Quick Links</h5>
                                </div>
                                <ul className="luminix-footer-menu-list d-md-block d-flex flex-wrap gap-md-0 gap-4">
                                    <li>
                                        <Link href="/"><LinkArrowIcon /><span className='ms-2'>Home</span></Link>
                                    </li>
                                    <li>
                                        <Link href="/about-us"><LinkArrowIcon /><span className='ms-2'>About Us</span></Link>
                                    </li>
                                    <li>
                                        <Link href="/jobs"><LinkArrowIcon /><span className='ms-2' >Jobs</span></Link>
                                    </li>
                                    <li>
                                        <Link href="/blog"><LinkArrowIcon /><span className='ms-2' >Blog</span></Link>
                                    </li>
                                    <li>
                                        <Link href="/contact-us"><LinkArrowIcon /><span className='ms-2' >Contact Us</span></Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* ── Contact Info — icons swapped for inline SVG ── */}
                        <div className="col-xxl-3 col-xl-6 col-md-6">
                            <div className="luminix-footer-menu2 ml-24">
                                <div className="luminix-footer-title">
                                    <span className="luminix-footer-title-mark"><TitleMarkIcon /></span>
                                    <h5>Contact Info</h5>
                                </div>
                                <ul className="luminix-footer-contact-list">
                                    <li className="luminix-footer-contact-item">
                                        <span className="luminix-footer-contact-icon"><LocationIcon /></span>
                                        <span className="luminix-footer-contact-text">{address || 'Address not configured'}</span>
                                    </li>
                                    <li className="luminix-footer-contact-item">
                                        <a href={`mailto:${contactEmail || ''}`}>
                                            <span className="luminix-footer-contact-icon"><MailIcon /></span>
                                            <span className="luminix-footer-contact-text">{contactEmail || 'Email not configured'}</span>
                                        </a>
                                    </li>
                                    <li className="luminix-footer-contact-item">
                                        <a href={`tel:${phone || ''}`}>
                                            <span className="luminix-footer-contact-icon"><CallIcon /></span>
                                            <span className="luminix-footer-contact-text">{phone || 'Phone not configured'}</span>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* ── Subscribe — icon-accented input + send icon ── */}
                        <div className="col-xxl-3 col-xl-6 col-md-6">
                            <div className="luminix-footer-menu2 ml-50 mb-0">
                                <div className="luminix-footer-title">
                                    <span className="luminix-footer-title-mark"><TitleMarkIcon /></span>
                                    <h5>Subscribe</h5>
                                </div>
                                <div className="luminix-subscription-field">
                                    <p>Stay updated with our latest Blogs &amp; Jobs</p>
                                    <form onSubmit={handleSubscribe} noValidate className="luminix-subscribe-form">
                                        <div className="luminix-subscribe-input-wrap">
                                            {/* <span className="luminix-subscribe-input-icon"><MailIcon /></span> */}
                                            <input
                                                type="email"
                                                placeholder="Your Email Address"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <button
                                            className="subcription-btn2 button-custom pill"
                                            type="submit"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Subscribing...' : (
                                                <>
                                                    Subscribe now
                                                    <SendIcon />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="luminix-footer-bottom-text">
                    <p>© Copyright {new Date().getFullYear()}, All Rights Reserved by JobsConnect</p>
                </div>
            </div>
        </footer>
    );
}