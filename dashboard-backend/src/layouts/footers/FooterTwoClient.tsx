"use client";

import Link from "next/link";
import { useJarallax } from "@/hooks/useJarallax";
import Image from "next/image";

interface Props {
    logoUrl?: string;
    logoAlt?: string;
    siteName?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
}

export default function FooterTwo({ logoUrl, logoAlt, siteName, contactEmail, phone, address }: Props) {
    const jarallaxRef = useJarallax(0.6);
    const displayName = siteName || "Jobs Connect";

    return (
        <footer
            ref={jarallaxRef}
            className="footer-section style-two jarallax bg-img"
            data-jarallax="{'speed': 0.6}"
            style={{ backgroundImage: "url(/assets/img/bg-img/1.jpg)" }}
        >
            <div className="divider-sm"></div>
            <div className="container">
                <div className="border-top"></div>
            </div>
            <div className="divider-sm"></div>

            <div className="container">
                <div className="row g-5 g-md-4 g-xl-5">

                    {/* ── Brand column ── */}
                    <div className="col-12 col-sm-6 col-md-4 col-xl-5">
                        <div className="footer-card me-xl-5">
                            <div>
                                <Link href="/" className="mb-4 d-inline-block">
                                    {logoUrl ? (
                                        <Image
                                            src={logoUrl}
                                            alt={logoAlt || displayName}
                                            width={139}
                                            height={36}
                                            style={{ objectFit: "contain", height: "3rem", width: "auto" }}
                                            unoptimized={logoUrl.startsWith("http")}
                                            priority
                                        />
                                    ) : (
                                        <div className="d-flex align-items-center justify-content-center me-auto" style={{ width: "fit-content" }}>
                                            <div className="px-2 py-2 rounded text-white h2 fs-bold logo-icon-bg-colour">JC</div>
                                            <p className="text-white ms-3 h5 mb-0">
                                                Jobs<span className="logo-text-colour"> Connect </span>
                                            </p>
                                        </div>
                                    )}
                                </Link>
                                <p>To drive sustainable corporate success, we provide job listings from industry leaders who prioritize competitive innovations, operational efficiencies, and talent-centric hiring strategies.</p>
                            </div>
                            {/* Contact info from site config */}
                            <ul className="list-unstyled footer-nav mb-4">
                                {address && (
                                    <li className="d-flex align-items-start gap-2">
                                        <i className="ti ti-map-pin mt-1 flex-shrink-0" />
                                        <span>{address}</span>
                                    </li>
                                )}
                                {phone && (
                                    <li className="d-flex align-items-center gap-2">
                                        <i className="ti ti-phone flex-shrink-0" />
                                        <a href={`tel:${phone}`}>{phone}</a>
                                    </li>
                                )}
                                {contactEmail && (
                                    <li className="d-flex align-items-center gap-2">
                                        <i className="ti ti-mail flex-shrink-0" />
                                        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                                    </li>
                                )}
                            </ul>

                            <div className="social-nav">
                                <a href="#" aria-label="Facebook"><i className="ti ti-brand-facebook" /></a>
                                <a href="#" aria-label="LinkedIn"><i className="ti ti-brand-linkedin" /></a>
                                <a href="#" aria-label="X"><i className="ti ti-brand-x" /></a>
                                <a href="#" aria-label="Instagram"><i className="ti ti-brand-instagram" /></a>
                            </div>
                        </div>
                    </div>

                    {/* ── Pages ── */}
                    <div className="col-12 col-sm-6 col-md">
                        <div className="footer-card">
                            <h5 className="mb-4">Pages</h5>
                            <ul className="list-unstyled footer-nav">
                                <li><a href="/">Home</a></li>
                                <li><a href="/about-us">About Us</a></li>
                                <li><a href="/contact-us">Contact Us</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* ── Platforms ── */}
                    <div className="col-12 col-sm-6 col-md">
                        <div className="footer-card">
                            <h5 className="mb-4">Platforms</h5>
                            <ul className="list-unstyled footer-nav">
                                <li><a href="#">Jobs Refugee</a></li>
                                <li><a href="/listing">Access Careers</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* ── Resources ── */}
                    {/* <div className="col-12 col-sm-6 col-md">
                        <div className="footer-card">
                            <h5 className="mb-4">Resources</h5>
                            <ul className="list-unstyled footer-nav">
                                <li><a href="/blog/page/1">Blog</a></li>
                                <li><a href="/career">Career</a></li>
                                <li><a href="/terms-of-service">Terms of Service</a></li>
                                <li><a href="/privacy-policy">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div> */}
                </div>
            </div>

            {/* ── Copyright ── */}
            <div className="container mt-5">
                <div className="copyright-section">
                    <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 gap-lg-4">
                        <p className="mb-0 copyright style-two">
                            Copyright © {new Date().getFullYear()}{" "}
                            <a href="/">{displayName}</a>{" "}
                            All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}