import React from 'react';
import ContactForm from '../ContactFrom/ContactForm';
import icon1 from '../../../public/images/icon/edit.svg';
import icon2 from '../../../public/images/icon/call-balck.png';
import icon3 from '../../../public/images/icon/sms-black.png';
import icon4 from '../../../public/images/icon/loc-black.png';
import icon5 from '../../../public/images/icon/bill.svg';
import cImg from '../../../public/contact-image.png';
import cImg2 from '../../../public/contact-image.png';
import Image from 'next/image';

const ContactSection: React.FC = () => {
  return (
    <section
      className="contact contact-bg pt-140 pb-100 pos-rel bg_img"
      style={{
        backgroundImage: `url('/images/bg/cont_bg-shape.png')`,
      }}
    >
      <div className="container">
        <div
          className="contact-two pos-rel bg_img"
          style={{
            backgroundImage: `url('/images/bg/cont-bg02.png')`,
          }}
        >
          <div className="row mt-none-30">
            <div className="col-lg-5 mt-30">
              <div className="cs-contact-wrap">
                <div className="xb-item--inner">
                  <div className="sec-title--two sec-title--three mb-25">
                    <span className="sub-title">
                      <Image src={icon1} alt="" />
                      <span>You are here</span>
                    </span>
                    <h2 className="title">Let&apos;s start</h2>
                  </div>
                  <p className="xb-item--content">
                    Initiating Your Journey to Success and Growth.
                  </p>
                  <ul className="xb-item--cont_info list-unstyled">
                    <li>
                      <span>
                        <Image src={icon2} alt="" />
                      </span>
                      +(1) 1230 452 8597
                    </li>
                    <li>
                      <span className="clr-sky">
                        <Image src={icon3} alt="" />
                      </span>
                      innomax@gmail.com
                    </li>
                    <li>
                      <span className="clr-orange">
                        <Image src={icon4} alt="" />
                      </span>
                      Sunshine example road
                    </li>
                  </ul>
                  <div className="xb-item--img">
                    <Image src={cImg} alt="" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7 mt-30">
              <div className="cs-contact-wrap cs-contact-form">
                <div className="sec-title--two sec-title--three">
                  <span className="sub-title">
                    <Image src={icon5} alt="" />
                    <span>Let’s connect!</span>
                  </span>
                  <h2 className="title">
                    Send us a message, and we&apos;ll promptly <br />
                    discuss your project with you.
                  </h2>
                </div>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="xb-shape">
        <Image src={cImg2} alt="" />
      </div>
    </section>
  );
};

export default ContactSection;
