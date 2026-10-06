'use client';

import React from 'react';
import Link from 'next/link';
import ContactForm from '../ContactFrom/ContactForm';
import icon1 from '../../public/images/icon/call-calling.svg';
import icon2 from '../../public/images/icon/icon-sms.svg';
import Image from 'next/image';

const ContactSection: React.FC = () => {
  return (
    <div>
      <div className="contact pt-85">
        <div className="container">
          <div className="row pb-130 mt-none-30">
            <div className="col-lg-8 mt-30">
              <div className="cs-contact-wrap cs-contact-form cd-contact-form item-contact_form">
                <h2 className="xb-title">Send us a message</h2>
                <p className="xb-content">Give us a chance to serve and bring magic to your brand.</p>
                <ContactForm />
              </div>
            </div>
            <div className="col-lg-4 mt-30">
              <div className="item-contact_info">
                <div className="xb-item--inner">
                  <div className="xb-item--top">
                    <h3 className="xb-item--title">Contact Info</h3>
                    <span className="xb-item--hotline">
                      <Image src={icon1} alt="Phone" /> +(1) 1230 452 8597
                    </span>
                    <span className="xb-item--email">
                      <Image src={icon2} alt="Email" /> innomax@example.com
                    </span>
                    <ul className="social_icons_block list-unstyled ul_li">
                      <li>
                        <Link href="/contact" aria-label="Facebook">
                          <i className="fab fa-facebook-f"></i>
                        </Link>
                      </li>
                      <li>
                        <Link href="/contact" aria-label="Twitter">
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 17 17"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M13.3872 0H15.9952L10.299 7.20048L17 17H11.7545L7.64298 11.0582L2.94415 17H0.332464L6.42395 9.29688L0 0H5.37853L9.09105 5.43101L13.3872 0ZM12.4711 15.2755H13.9155L4.5917 1.63462H3.0402L12.4711 15.2755Z"
                              fill="#0C111D"
                            />
                          </svg>
                        </Link>
                      </li>
                      <li>
                        <Link href="/contact" aria-label="Linkedin">
                          <i className="fab fa-linkedin-in"></i>
                        </Link>
                      </li>
                    </ul>
                  </div>

                  <div className="contact-info_widget">
                    <h3 className="xb-title">United States Office</h3>
                    <span className="xb-location">
                      Sunshine Example Park, Floor <br />
                      No 05A, Sector-94,
                    </span>
                  </div>

                  <div className="contact-info_widget">
                    <h3 className="xb-title">United Kingdom Office</h3>
                    <span className="xb-location">
                      12 Buckingham Rd, Example <br />
                      Thwaite, HG3 4TY, UK
                    </span>
                  </div>

                  <hr className="breack-line" />

                  <div className="contact-info_widget">
                    <h3 className="xb-title">Our Office Hours</h3>
                    <span className="xb-location">
                      Mon - Sat: 8.00 - 5.00 <br />
                      Sunday: Closed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="gmap_canvas bg-light">
        <iframe
          title="Google Map"
          src="https://maps.google.com/maps?q=2880%20Broadway,%20New%20York&amp;t=&amp;z=13&amp;ie=UTF8&amp;iwloc=&amp;output=embed"
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
};

export default ContactSection;
