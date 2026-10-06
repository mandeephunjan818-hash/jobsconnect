"use client";

import React, { FormEvent } from "react";
import Marquee from "react-fast-marquee";
import Link from "next/link";
import Image from "next/image";

import Bg from '../../../public/images/bg/footer-glassisom.png';
import icon1 from '../../../public/images/icon/email.png';
import icon2 from '../../../public/images/icon/sms.svg';

const Footer = () => {
  const SubmitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Subscribed!");
  };

  return (
    <footer className="footer pos-rel mt-80" style={{ backgroundColor: "#111112" }}>
      <div className="container">
        <div className="row pb-95">
          <div className="col-lg-4">
            <div className="xb-newslatter">
              <div className="xb-item--icon">
                <Image src={icon1} alt="Email icon" />
              </div>
              <h2 className="xb-item--title">Subscribe us</h2>
              <span className="xb-item--content">
                Want to stay up to date? Sign up for innomax it services update.
              </span>
              <form className="xb-item--contact mt-35" onSubmit={SubmitHandler}>
                <div className="xb-item--input_field pos-rel">
                  <input
                    type="email"
                    name="gmail"
                    id="text6"
                    placeholder="enter your email"
                    required
                  />
                  <div className="img">
                    <Image src={icon2} alt="SMS icon" />
                  </div>
                </div>
                <button type="submit" className="xb-item--button btn-effect_2">
                  Subscribe us
                </button>
                <span className="xb-item--text">Don&apos;t worry about spam. We hate it too!</span>
              </form>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="xb-footer is-footer ml-75">
              <ul className="footer-nav list-unstyled ul_li">
                <li><Link href="/home">Home</Link></li>
                <li><Link href="/about">About</Link></li>
                <li>
                  <Link href="/career">Career</Link>
                  <span>we’re hiring</span>
                </li>
                <li><Link href="/blog">News & media.</Link></li>
                <li><Link href="/contact">Get in touch.</Link></li>
              </ul>
              <div className="footer-inner mt-50 ul_li_between align-items-start">
                <div className="footer-widget">
                  <span className="xb-item--sub-title">Information</span>
                  <ul className="xb-item--holder list-unstyled">
                    <li className="xb-item--list"><Link href="/service">Our services</Link></li>
                    <li className="xb-item--list"><Link href="/casestudy">Case studies</Link></li>
                    <li className="xb-item--list"><Link href="/pricing">Our pricing</Link></li>
                    <li className="xb-item--list"><Link href="/">our partners</Link></li>
                  </ul>
                </div>
                <div className="footer-widget">
                  <span className="xb-item--sub-title">Office address</span>
                  <ul className="xb-item--holder list-unstyled">
                    <li className="xb-item--list"><Link href="/">Texpo gmbH</Link></li>
                    <li className="xb-item--list"><Link href="/">stefan-george-ring 23</Link></li>
                    <li className="xb-item--list"><Link href="/">81929 münchen</Link></li>
                    <li className="xb-item--list"><Link href="/">germany</Link></li>
                  </ul>
                </div>
                <div className="footer-info footer-widget">
                  <span className="xb-item--sub-title">Email us</span>
                  <h4 className="xb-item--email">texpo@gmail.com</h4>
                  <span className="xb-item--sub-title">call us</span>
                  <h4 className="xb-item--number">+(1) 1230 452 8597</h4>
                </div>
              </div>
              <div className="footer-copyright mt-50 ul_li_between">
                <p className="copyright mt-20">
                  Copyright © 2025 <Link href="/home">innomax</Link>. All rights reserved.
                </p>
                <ul className="footer-links ul_li mt-20">
                  <li><Link href="/terms-conditions">Terms of Up</Link></li>
                  <li><Link href="/privacy-policy">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="footer-bottom pos-rel bg_img o-hidden"
        style={{ backgroundImage: `url(${Bg.src})` }}
      >
        <Link href="/contact" className="title marquee-left" data-cursor-text="say hi!">
          <div className="marquee">
            <div className="marquee-content">
              <Marquee speed={50} gradient={false}>
                Let’s discuss today. Are you interested?
                Let’s discuss today. Are you interested?
                Let’s discuss today. Are you interested?
                Let’s discuss today. Are you interested?
              </Marquee>
            </div>
          </div>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
