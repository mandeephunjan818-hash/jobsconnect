'use client';

import React, { FormEvent } from 'react';
import Link from "next/link";
import Services from '../../../api/service';
import icon1 from '../../../public/images/footer/social-link01.png';
import icon2 from '../../../public/images/footer/social-link02.png';
import icon3 from '../../../public/images/footer/social-link03.png';
import icon4 from '../../../public/images/footer/social-link04.png';
import icon5 from '../../../public/images/footer/social-link05.png';
import icon6 from '../../../public/images/icon/airdrop01.svg';
import Image from 'next/image';

const SubmitHandler = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

const Footer: React.FC = () => {
  return (
    <footer
      className="footer bg_img footer-style-two footer-style-three pt-120 pos-rel"
      style={{
        backgroundColor: "#010315",
        backgroundImage: `url('/images/bg/footer_overly.png')`,
      }}
    >
      <div className="container">
        <div className="xb-footer">
          <div className="sec-title--two sec-title--three text-center mb-40">
            <span className="sub-title">
              <Image src={icon6} alt="Join icon" />
              <span>Join the innomax community</span>
            </span>
          </div>

          <div className="social-link ul_li_between">
            {[icon1, icon2, icon3, icon4, icon5].map((icon, i) => (
              <div key={i} className="social-item">
                <Link href="/home-4" className="xb-icon">
                  <Image src={icon} alt={`Social Icon ${i + 1}`} />
                </Link>
              </div>
            ))}
          </div>

          <div className="footer-inner mt-80 mb-70 ul_li_between align-items-start">
            <div className="footer-widget">
              <span className="xb-item--sub-title">Company</span>
              <ul className="xb-item--holder list-unstyled">
                <li className="xb-item--list"><Link href="/about">About us</Link></li>
                <li className="xb-item--list"><Link href="/career">Careers</Link></li>
                <li className="xb-item--list"><Link href="/home-4">Processes</Link></li>
                <li className="xb-item--list"><Link href="/contact">Contact us</Link></li>
              </ul>
            </div>

            <div className="footer-widget">
              <span className="xb-item--sub-title">Our Services</span>
              <ul className="xb-item--holder list-unstyled">
                {Services.slice(14, 18).map((service, index) => (
                  <li key={index} className="xb-item--list">
                    {service.title ? (
                      <Link href={'/service-single'}>
                        {service.title}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-widget">
              <span className="xb-item--sub-title">Resources</span>
              <ul className="xb-item--holder list-unstyled">
                <li className="xb-item--list"><Link href="/blog">innomax Blog</Link></li>
                <li className="xb-item--list"><Link href="/casestudy">Case Studies</Link></li>
                <li className="xb-item--list"><Link href="/home-4">Achievements</Link></li>
                <li className="xb-item--list"><Link href="/home-4">Our industries</Link></li>
              </ul>
            </div>

            <div className="sa-newslatter footer-widget">
              <span className="xb-item--sub-title">Newsletter</span>
              <p className="xb-item--content clr-white">Sign up for innomax weekly updates.</p>
              <div className="xb-item--input-box">
                <label htmlFor="emailInput">Email</label>
                <form
                  className="xb-item--input_field pos-rel"
                  onSubmit={SubmitHandler}
                >
                  <input type="email" name="gmail" id="emailInput" required />
                  <button type="submit" className="xb-item--btn" aria-label="Subscribe">
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="footer-copyright mt-70 ul_li_between">
            <p className="copyright mt-20">
              Copyright © 2025 <Link href="/home-4">innomax</Link>. All rights reserved.
            </p>
            <p className="mt-20">
              Designed by <Link href="/home-4">XpressBuddy</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
