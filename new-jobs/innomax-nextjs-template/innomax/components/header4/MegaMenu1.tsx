'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import avatar from '../../public/images/bg/avatar.png';
import quote from '../../public/images/icon/quote.png';

const MegaMenu1: React.FC = () => {
  const items = [
    { href: '/about', icon: '/images/icon/m_01.svg', title: 'About Us', desc: 'Learn more about Innomax' },
    { href: '/pricing', icon: '/images/icon/m_02.svg', title: 'Our Pricing', desc: 'Streamlined Pricing' },
    { href: '/team', icon: '/images/icon/m_03.svg', title: 'Our Team', desc: 'We are friendly. Join our team.' },
    { href: '/service', icon: '/images/icon/m_04.svg', title: 'Services', desc: 'Happy to help you!' },
    { href: '/service-single', icon: '/images/icon/m_05.svg', title: 'Services Details', desc: 'Happy to help you!' },
    { href: '/casestudy', icon: '/images/icon/m_06.svg', title: 'Casestudy', desc: 'Explore all case studies.' },
    { href: '/career', icon: '/images/icon/m_07.svg', title: 'Career', desc: 'Work with us!' },
    { href: '/career-details', icon: '/images/icon/m_08.svg', title: 'Career Details', desc: 'Open roles and more.' },
    { href: '/casestudy-details', icon: '/images/icon/m_09.svg', title: 'Casestudy Details', desc: 'Detailed breakdowns.' },
    { href: '/terms-conditions', icon: '/images/icon/m_10.svg', title: 'Terms & Conditions', desc: 'Your rights & responsibilities.' },
    { href: '/privacy-policy', icon: '/images/icon/m_11.svg', title: 'Privacy Policy', desc: 'Commitment to confidentiality.' },
  ];

  const clientLogos = [
    { src: '/images/logo/client-logo.svg', alt: 'Client 1' },
    { src: '/images/logo/client-logo2.svg', alt: 'Client 2' },
  ];

  return (
    <ul className="submenu">
      <li>
        <div className="mega_menu_wrapper">
          <div className="container">
            <div className="mega_menu_wrapper_inner">
              <div className="row">
                {/* Left side */}
                <div className="col-xl-9">
                  <div className="megamenu_pages_wrapper mb-5">
                    <div className="row g-10">
                      {items.map((item, index) => (
                        <div className="col-xl-4 col-md-4" key={index}>
                          <Link className="iconbox_block_2" href={item.href}>
                            <span className="icon_title_wrap">
                              <small className="iconbox_icon">
                                <Image
                                  src={item.icon}
                                  alt={item.title}
                                  width={40}
                                  height={40}
                                  style={{ height: 'auto' }}
                                />
                              </small>
                              <small className="iconbox_title">{item.title}</small>
                            </span>
                            <span className="description mb-0">{item.desc}</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buttons and Reviews */}
                  <ul className="btns_group p-0 unordered_list justify-content-start">
                    <li>
                      <Link
                        href="/contact"
                        className="thm-btn thm-btn--aso megamenu-btn thm-btn--header-black"
                      >
                        Get free consultation
                      </Link>
                    </li>

                    {clientLogos.map((logo, idx) => (
                      <li key={idx}>
                        <div className="review_short_info_2">
                          <div className="review_admin_logo">
                            <Image
                              src={logo.src}
                              alt={logo.alt}
                              width={40}
                              height={40}
                              style={{ height: 'auto' }}
                            />
                          </div>
                          <div className="review_info_content">
                            <ul className="rating_block unordered_list">
                              {[...Array(5)].map((_, i) => (
                                <li key={i}>
                                  <i className="fas fa-star" />
                                </li>
                              ))}
                            </ul>
                            <div className="review_counter">
                              From <b>200+</b> reviews
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right side */}
                <div className="col-xl-3">
                  <div className="autpr_box">
                    <div className="site_author">
                      <div className="author_box">
                        <div className="author_image bg-light">
                          <Image
                            src={avatar}
                            alt="Author"
                            width={60}
                            height={60}
                            style={{ height: 'auto' }}
                          />
                        </div>
                        <div className="author_box_content">
                          <h3 className="author_name text-white">Maverick Phoenix</h3>
                          <span className="author_designation text-white">CEO at Innomax</span>
                        </div>
                      </div>
                      <p className="mb-0 text-white">
                        “As CEO at Innomax, I’ve worked hard to clarify client requirements and deliver results
                        efficiently without reinventing the wheel.”
                      </p>
                      <div className="author_box_quote">
                        <Image
                          src={quote}
                          alt="Quote"
                          width={40}
                          height={40}
                          style={{ height: 'auto' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ul>
  );
};

export default MegaMenu1;
