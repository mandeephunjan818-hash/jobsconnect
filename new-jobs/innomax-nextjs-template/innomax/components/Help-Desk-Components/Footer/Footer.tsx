"use client";

import React, { FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import icon1 from '../../../public/images/icon/call-calling.png';
import icon2 from '../../../public/images/icon/sms-notification.png';
import icon3 from '../../../public/images/footer/google-play.png';
import icon4 from '../../../public/images/footer/app-store.png';

const SubmitHandler = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

const Footer: React.FC = () => {
  return (
    <footer
      className="footer footer-style-two footer-style-four bg_img pos-rel"
      style={{ backgroundColor: '#16140c' }}
    >
      <div className="container">
        <div className="xb-footer">
          <div className="row">
            <div className="col-lg-4 col-md-6">
              <div className="footer-widget">
                <span className="xb-item--sub-title">📦 Products</span>
                <ul className="xb-item--holder list-unstyled">
                  <li className="xb-item--list">
                    <Link href="/home-6">How it’s work</Link>
                  </li>
                  <li className="xb-item--list">
                    <Link href="/home-6">Integrations</Link>
                  </li>
                  <li className="xb-item--list">
                    <Link href="/blog">Our Blog</Link>
                  </li>
                  <li className="xb-item--list">
                    <Link href="/home-6">Our Features</Link>
                  </li>
                  <li className="xb-item--list">
                    <Link href="/contact">Real Feedback</Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="footer-widget footer-nees-helf">
                <span className="xb-item--sub-title">✍️ need help</span>
                <ul className="xb-item--holder list-unstyled">
                  <li className="xb-item--number">
                    <span>
                      <Image src={icon1} alt="Phone icon" />
                    </span>
                    +618 8967 5983
                  </li>
                  <li className="xb-item--email">
                    <span>
                      <Image src={icon2} alt="Email icon" />
                    </span>
                    innomax@gmail.com
                  </li>
                </ul>
                <ul className="xb-item--social-link list-unstyled ul_li mt-45">
                  <li className="xb-item--social-icon">
                    <Link href="/home-6" aria-label="Facebook">
                      <i className="fab fa-facebook-f"></i>
                    </Link>
                  </li>
                  <li className="xb-item--social-icon">
                    <Link href="/home-6" aria-label="Custom Social Icon">
                      <svg
                        width="15"
                        height="16"
                        viewBox="0 0 15 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8.82904 7.15568L14.3506 0.737305H13.0422L8.2478 6.31029L4.41855 0.737305H0.00195312L5.79254 9.16465L0.00195312 15.8953H1.31046L6.37345 10.01L10.4174 15.8953H14.834L8.82872 7.15568H8.82904ZM7.03686 9.23889L6.45015 8.39972L1.78194 1.72233H3.79173L7.55904 7.1112L8.14574 7.95037L13.0428 14.9551H11.033L7.03686 9.23921V9.23889Z"
                          fill="white"
                        />
                      </svg>
                    </Link>
                  </li>
                  <li className="xb-item--social-icon">
                    <Link href="/home-6" aria-label="LinkedIn">
                      <i className="fab fa-linkedin-in"></i>
                    </Link>
                  </li>
                  <li className="xb-item--social-icon">
                    <Link href="/home-6" aria-label="YouTube">
                      <i className="fab fa-youtube"></i>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="sa-newslatter footer-widget">
                <span className="xb-item--sub-title">👇 download app</span>
                <div className="xb-item--apps ul_li">
                  <div className="xb-item--app">
                    <Link href="/home-6">
                      <Image src={icon3} alt="Google Play Store" />
                    </Link>
                  </div>
                  <div className="xb-item--app">
                    <Link href="/home-6">
                      <Image src={icon4} alt="Apple App Store" />
                    </Link>
                  </div>
                </div>
                <div className="xb-item--input-box">
                  <label htmlFor="email">📩 Email</label>
                  <form className="xb-item--input_field pos-rel" onSubmit={SubmitHandler}>
                    <input type="email" name="gmail" id="email" required />
                    <button type="submit" className="xb-item--btn" aria-label="Send email">
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-copyright ul_li_between">
            <p className="copyright mt-20">
              Copyright © 2025{' '}
              <Link href="/home-6" aria-label="Innomax homepage">
                innomax
              </Link>
              . All rights reserved.
            </p>
            <ul className="hds-footer-links ul_li mt-20">
              <li>
                <Link href="/terms-conditions">Terms & Conditions</Link>
              </li>
              <li>
                <Link href="/privacy-policy">Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
