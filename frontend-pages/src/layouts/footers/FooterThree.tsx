
import socialLinksFooter from "@/data/socialLinksFooter";
import Image from "next/image";
import Link from "next/link";


// images import   
import logo_white1_img from "@/assets/images/logo/logo-white1.svg";
import location_img from "@/assets/images/iconbox/location.svg";
import mail_img from "@/assets/images/iconbox/mail.svg";
import call_img from "@/assets/images/iconbox/call.svg";
import clock_img from "@/assets/images/iconbox/clock.svg";



const FooterThree = () => {
  return (
    <>
      <footer className="luminix-footer-section1">
        <div className="container">
          <div className="luminix-cta-title">
            <div className="row">
              <div className="col-xxl-7 col-xl-6 ">
                <h2>Let's work together</h2>
              </div>
              <div className="col-xxl-5 col-xl-6 ">
                <form>
                  <div className="luminix-cta-input-field">
                    <input type="email" placeholder="Your Email Address" />
                    <button className="luminix-subcribe-btn cta-btn" type="submit">Subscribe now</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="luminix-footer-one">
            <div className="row">
              <div className="col-xxl-4 col-xl-3 col-md-6">
                <div className="luminix-footer-textarea">
                  <Link href="/">
                    <Image width={139} height={60} src={logo_white1_img} alt="here is theme image" />
                  </Link>
                  <p>To achieve sustainable growth and success, we run businesses that must consistently adapt to competitive innovations, operational efficiencies and client-centric strategies.</p>
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
              <div className="col-xxl-2 col-xl-3 col-md-6">
                <div className="luminix-footer-menu pl-50 ml-15">
                  <div className="luminix-footer-title">
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
              <div className="col-xxl-3 col-xl-3 col-md-6">
                <div className="luminix-footer-menu pl-51">
                  <div className="luminix-footer-title">
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
              <div className="col-xxl-3 col-xl-3 col-md-6">
                <div className="luminix-footer-menu2 mb-0 pl-50">
                  <div className="luminix-footer-title">
                    <h5>Contact Info</h5>
                  </div>
                  <ul>
                    <li>
                      <Image width={22} height={25} src={location_img} alt="here is theme image" />
                      42 Mamnoun Streek, UK
                    </li>
                    <li>
                      <a href="mailto:name@email.com">
                        <Image width={25} height={21} src={mail_img} alt="here is theme image" />
                        support.bandco@gmail.com
                      </a>
                    </li>
                    <li>
                      <a href="tel:+088">
                        <Image width={24} height={25} src={call_img} alt="here is theme image" />
                        +088-748-7888
                      </a>
                    </li>
                    <li>
                      <Image width={25} height={26} src={clock_img} alt="here is theme image" />
                      Mon - Sat: 10.00 - 18.00
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="luminix-footer-bottom-text">
            <p>© Copyright {new Date().getFullYear()}, All Rights Reserved by WebArwa</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterThree;