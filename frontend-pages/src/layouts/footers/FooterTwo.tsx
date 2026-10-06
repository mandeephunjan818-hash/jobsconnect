"use client"

import socialLinksFooter from "@/data/socialLinksFooter";
import Image from "next/image";
import Link from "next/link";

// images import   
import logo_white1_img from "@/assets/images/logo/logo-white1.svg"; 
import footer_1_img from "@/assets/images/footer/f1.png";
import footer_4_img from "@/assets/images/footer/f4.png";
import footer_2_img from "@/assets/images/footer/f2.png";
import footer_5_img from "@/assets/images/footer/f5.png";
import footer_6_img from "@/assets/images/footer/f6.png";
import footer_3_img from "@/assets/images/footer/f3.png";



const FooterTwo = () => {
  return (
    <>
      <footer className="luminix-footer-section1">
        <div className="container">
          <div className="luminix-footer-one">
            <div className="row">
              <div className="col-xxl-4 col-xl-12">
                <div className="luminix-footer-textarea pr-50">
                  <Link href="/">
                    <Image width={139} height={60} src={logo_white1_img} alt="here is theme image" />
                  </Link>
                  <p>To achieve sustainable and success, we run businesses and that must adapt to competitive innovations and efficiencies client-centric strategies.</p>
                  <div className="luminix-social-wrap wrap2">
                    <ul>
                      {socialLinksFooter.map((link, index) => (
                        <li key={index}>
                          <Link href={link.href} target="_blank" dangerouslySetInnerHTML={{ __html: link.svg }}>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-xxl-2 col-xl-4 col-md-4">
                <div className="luminix-footer-menu">
                  <div className="luminix-footer-title2">
                    <h5>Primary Pages</h5>
                  </div>
                  <ul>
                    <li>
                      <Link href="/contact-us">Demos</Link>
                    </li>
                    <li>
                      <Link href="/about-us">About Us</Link>
                    </li>
                    <li>
                      <Link href="/blog">Blog</Link>
                    </li>
                    <li>
                      <Link href="/portfolio">Projects</Link>
                    </li>
                    <li>
                      <Link href="/contact-us">Contact</Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="col-xxl-3 col-xl-4 col-md-4">
                <div className="luminix-footer-menu pl-51">
                  <div className="luminix-footer-title2">
                    <h5>Our Services</h5>
                  </div>
                  <ul>
                    <li>
                      <Link href="/about-us">Business Strategy</Link>
                    </li>
                    <li>
                      <Link href="/single-service">Customer Experience</Link>
                    </li>
                    <li>
                      <Link href="/portfolio">Financial Advices</Link>
                    </li>
                    <li>
                      <Link href="/team">Business Planning</Link>
                    </li>
                    <li>
                      <Link href="/blog">Manage Investment</Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="col-xxl-3 col-xl-4 col-md-4">
                <div className="luminix-footer-menu2">
                  <div className="luminix-footer-title2">
                    <h5>Latest Projects</h5>
                  </div>
                  <div className="luminix-instagram-wrap">
                    <div className="luminix-instagram-thumb">
                      <Link href="/portfolio"><Image width={95} height={94} src={footer_1_img} alt="here is theme image" /></Link>
                    </div>
                    <div className="luminix-instagram-thumb">
                      <Link href="/portfolio"><Image width={95} height={94} src={footer_4_img} alt="here is theme image" /></Link>
                    </div>
                    <div className="luminix-instagram-thumb">
                      <Link href="/portfolio"><Image width={95} height={94} src={footer_2_img} alt="here is theme image" /></Link>
                    </div>
                    <div className="luminix-instagram-thumb">
                      <Link href="/portfolio"><Image width={95} height={94} src={footer_5_img} alt="here is theme image" /></Link>
                    </div>
                    <div className="luminix-instagram-thumb">
                      <Link href="/portfolio"><Image width={95} height={94} src={footer_6_img} alt="here is theme image" /></Link>
                    </div>
                    <div className="luminix-instagram-thumb">
                      <Link href="/portfolio"><Image width={95} height={94} src={footer_3_img} alt="here is theme image" /></Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="luminix-footer-bottom-text text2">
            <p>© Copyright {new Date().getFullYear()}, All Rights Reserved by WebArwa</p>
            <div className="luminix-footer-bottom-menu ">
              <ul>
                <li><Link href="/contact-us" className="dot">Privacy Policy</Link></li>
                <li><Link href="/contact-us">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterTwo;